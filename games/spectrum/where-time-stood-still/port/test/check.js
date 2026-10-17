'use strict';
// A routine of the port checked alone against the game's own (kit/skills/core/70-minisite/play.md,
// "Test each routine alone first"), on the moments the game itself calls it: the machine is run on
// from the moments of play in work/states, and each time the program counter reaches the routine
// (in its bank) the whole machine is taken, registers, every bank, $7FFD, the AY and the input as
// they stand. Each case then runs the game's routine on the kit's Z80 (standin.js, with nothing of
// the port in it) and the port's on P, each on its own copy, until it returns; and compares all of
// memory (as the processor sees it and each bank), $7FFD, the AY's registers, the writes to the
// ULA and the AY in order, and the registers named in outs. setup(c, rnd) may change a case first:
// c.M (the 64 KB), c.banks, c.regs. Routines the port has not written are the game's code on the
// port's side too.
//
//   const { check } = require('./check.js');
//   check({ name: 'clock', outs: ['a'], cases: 300 });
// Options: entry (an address, for a place that is not a label, with bank), states (a filter of
// state names), per (cases taken from each state, default 4), passes (how far to run from each
// state, default 40), play (how the player plays meanwhile: walk, still or mix; PLAY), most (how many states, spread over them, default 60), ignore (addresses or [first, last] ranges), show (failures printed), port (P => ..., run on the port's side before each case: a routine that never returns stopped where the case's setup stops the game's, by a RET written there).
const path = require('path');
const lib = require('./lib.js');
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

const AY_MASK = [0xFF, 0x0F, 0xFF, 0x0F, 0xFF, 0x0F, 0x1F, 0xFF, 0x1F, 0x1F, 0x1F, 0xFF, 0xFF, 0x0F, 0xFF, 0xFF];
// The machine around the processor for one side of a case: the input as it stood, $7FFD paging
// P.mem, the AY's registers, and a log of the writes to the ULA and the AY.
class CaseIO {
  constructor(c, mem) {
    this.mem = mem; this.paging = c.paging; this.ay = { sel: c.ay.sel, regs: Uint8Array.from(c.ay.regs) };
    this.keys = new Set(c.keys); this.joy = c.joy; this.ear = c.ear; this.border = c.border; this.log = []; this.sp = c.sp;
  }
  in(port) {
    if ((port & 0x20) === 0 && (port & 1)) return this.joy;
    if ((port & 0xC002) === 0xC000) { const r = this.ay.sel; return r < 14 ? this.ay.regs[r] : 0xFF; }
    if (port & 1) return 0xFF;
    const high = port >> 8;
    let v = 0x1F;
    for (const k of this.keys) if (!(high & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
    return 0xA0 | (this.ear << 6) | v;
  }
  out(port, v) {
    if (!(port & 0x8002) && !(this.paging & 0x20)) { this.paging = v; this.mem.page(v & 7); this.log.push('7FFD=' + v); }
    if ((port & 0xC002) === 0xC000) this.ay.sel = v & 15;
    else if ((port & 0xC002) === 0x8000) { this.ay.regs[this.ay.sel] = v & AY_MASK[this.ay.sel]; this.log.push('AY' + this.ay.sel + '=' + v); }
    if (port & 1) return;
    this.border = v & 7; this.ear = (v >> 4) & 1;
    this.log.push('FE=' + v);
  }
}

// The machine at the routine's entries, from the states: { M, banks, paging, ay, regs, sp, keys,
// joy, ear, border, state }.
const cache = new Map();
const J = lib.JOY, WALK = [J.RIGHT, J.UP, J.LEFT, J.DOWN, J.UP | J.RIGHT, J.DOWN | J.LEFT, J.UP | J.LEFT, J.DOWN | J.RIGHT];
// How the player plays from each state (o.play): walk, the stick held one way and then another so
// the leader walks and the view scrolls; still; or mix, a choice every 25 frames from a seeded
// sequence of walking, walking with fire, fire alone, a tap of SPACE (a menu) and nothing, so
// menus open, items are used and shots fly.
const PLAY = {
  walk: (m, i, k0) => { m.releaseAll(); m.joy = WALK[(k0 + (i / 60 | 0)) % WALK.length]; },
  still: () => {},
  mix: (m, i, k0) => {
    const slot = i / 25 | 0, at = i % 25;
    let x = (k0 * 7919 + slot * 104729) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0x5bd1e995) >>> 0; x = (x ^ (x >>> 15)) >>> 0;
    const pick = x % 20, dir = WALK[(x >>> 8) % WALK.length];
    m.releaseAll(); m.joy = 0;
    if (pick < 9) m.joy = dir;
    else if (pick < 12) m.joy = dir | J.FIRE;
    else if (pick < 14) m.joy = J.FIRE;
    else if (pick < 16) { if (at < 4) m.press('SPACE'); }
  },
};
const keyOf = (address, bank, o, play) => address + ':' + bank + ':' + (o.states || '') + ':' + (o.per || 4) + ':' + (o.passes || 60) + ':' + play;
function entries(address, bank, o = {}) {
  const play = o.play || (o.still ? 'still' : 'walk');
  const key = keyOf(address, bank, o, play);
  if (!cache.has(key)) gather([[address, bank]], o);
  return cache.get(key);
}
// The cases for several routines from one run of the sessions (each routine's are those it would
// have alone: the first `per` calls from each state).
function gather(where, o = {}) {
  const play = o.play || (o.still ? 'still' : 'walk');
  where = where.filter(([a, b]) => !cache.has(keyOf(a, b, o, play)));
  if (!where.length) return;
  const outs = where.map(() => []);
  const per = o.per || 4, passes = o.passes || 40, every = o.every || 1;
  const all = lib.states(typeof o.states === 'string' ? o.states : '');
  const most = o.most || 60, step = Math.max(1, all.length / most);
  for (let i = 0; i < all.length; i += step) {
    const f = all[Math.floor(i)];
    const m = lib.restore(lib.readState(f));
    const got = where.map(() => 0), seen = where.map(() => 0);
    const at = new Map();
    where.forEach(([address, bank], j) => { if (!at.has(address)) at.set(address, []); at.get(address).push([bank, j]); });
    for (const [address, list] of at) {
      m.hooks[address] = mm => {
        for (const [bank, j] of list) {
          if (bank >= 0 && (mm.paging & 7) !== bank) continue;
          if (got[j] >= per || seen[j]++ % every) continue;
          const cpu = mm.cpu, regs = {};
          for (const k of ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_']) regs[k] = cpu[k];
          outs[j].push({ M: mm.ram.slice(), banks: [0, 1, 2, 3, 4, 5, 6, 7].map(n => mm.bank(n).slice()), paging: mm.paging,
            ay: { sel: mm.ay.sel, regs: Array.from(mm.ay.regs) }, regs, sp: cpu.sp, keys: [...mm.keys], joy: mm.joy, ear: mm.ear,
            border: mm.border, state: f });
          got[j]++;
        }
        return false;
      };
    }
    const k0 = Math.floor(i);
    for (let i = 0; i < passes * 8 && got.some(g => g < per); i++) {
      PLAY[play](m, i, k0);
      m.runFrames(1);
    }
  }
  where.forEach(([address, bank], j) => {
    const list = typeof o.states === 'function' ? outs[j].filter(o.states) : outs[j];
    cache.set(keyOf(address, bank, o, play), list);
  });
}
// gather by names and entries: ['name', 0xC260, ...]
function prefetch(names, o = {}) {
  const L = standin.labels();
  if (ONLY) names = names.filter(n => wanted(typeof n === 'number' ? { entry: n } : { name: n }));
  gather(names.map(n => {
    if (typeof n === 'number') return [n, n < 0xC000 ? -1 : 3];
    const e = L.byName.get(n);
    if (!e) throw new Error('prefetch: no label ' + n);
    return [e.a, e.bank];
  }), o);
}

const hex = lib.hex, hex2 = v => '$' + (v & 255).toString(16).toUpperCase().padStart(2, '0');
const NAMES = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_'];

// One side of a case: P with the case's memory, banks and machine; the game's side has no port.
function side(c, port) {
  const WT = loadPort();
  const M = c.M.slice();
  const mem = new WT.Banks(M, c.banks, c.paging & 7);
  const cio = new CaseIO(c, mem);
  const io = { in: p => cio.in(p), out: (p, v) => cio.out(p, v), irqByte: a => M[a], sp: (c.sp + 2) & 0xFFFF };
  const P = port ? WT.makePort(M, io, { mem }) : WT.makePort(M, io, { mem, only: [] });
  standin.install(P);
  return { P, M, mem, log: cio.log, ioObj: cio };
}
function snapshot(s) {
  const banks = [0, 1, 2, 3, 4, 5, 6, 7].map(n => s.mem.bank(n));
  return { banks, paging: s.ioObj.paging, ay: Array.from(s.ioObj.ay.regs), log: s.log.join(' ') };
}

// ONLY=name,name (or addresses in hex) in the environment checks just those
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wanted = o => !ONLY || ONLY.includes(o.name) || (o.entry !== undefined && ONLY.includes(o.entry.toString(16)));
function check(o) {
  if (!wanted(o)) return { fails: 0, cases: 0 };
  const L = standin.labels();
  let address, bank;
  if (o.entry !== undefined) { address = o.entry; bank = o.bank !== undefined ? o.bank : address < 0xC000 ? -1 : 3; }
  else {
    const e = L.byName.get(o.name);
    if (!e) throw new Error('check: no label ' + o.name);
    address = e.a; bank = e.bank;
  }
  const list = o.cases0 || entries(address, bank, o);
  const rnd = lib.makeRnd(o.seed || 1);
  const outs = o.outs || [];
  const skip = new Uint8Array(65536);
  skip.fill(1, 0x798B, 0x798D);                    // the stack pointer the sound driver saves (lockstep.js)
  for (const x of o.ignore || []) if (Array.isArray(x)) skip.fill(1, x[0], x[1] + 1); else skip[x] = 1;
  let fails = 0, shown = 0, n = 0;
  const cases = Math.min(o.cases || 300, o.setup ? Infinity : list.length);
  for (let k = 0; k < cases && list.length; k++) {
    const c0 = list[k % list.length];
    const c = { M: c0.M.slice(), banks: c0.banks.map(b => b.slice()), paging: c0.paging, ay: c0.ay, regs: Object.assign({}, c0.regs),
      sp: c0.sp, keys: c0.keys, joy: c0.joy, ear: c0.ear, border: c0.border, state: c0.state };
    if (o.setup && o.setup(c, rnd) === false) continue;
    n++;
    // the stack below the entry's, never compared
    const sk = skip.slice();
    sk.fill(1, Math.max(0x4000, c.sp - 0x100), c.sp + 2);
    const A = side(c, false), B = side(c, true);
    if (o.port) o.port(B.P);
    let rA, rB, eA = null, eB = null;
    try { rA = A.P.at(address, Object.assign({}, c.regs)); } catch (e) { eA = e; }
    try {
      const name = o.entry !== undefined ? (address < 0xC000 ? B.P.CODE[address] : B.P.CODE3[address]) : o.name;
      if (!name || typeof B.P[name] !== 'function') throw new Error('the port has no ' + (name || hex(address)));
      const regs = standin.regsOf({ a: c.regs.a, f: c.regs.f, b: c.regs.b, c: c.regs.c, d: c.regs.d, e: c.regs.e, h: c.regs.h, l: c.regs.l,
        ix: c.regs.ix, iy: c.regs.iy, af_: c.regs.af_, bc_: c.regs.bc_, de_: c.regs.de_, hl_: c.regs.hl_ });
      rB = B.P[name](regs);
      if (rB && typeof rB.next === 'function') { let y, g = 0; const it = rB; while (!(y = it.next()).done) if (++g > 1e6) throw new Error('never ended'); rB = y.value; }
      rB = rB || {};
    } catch (e) { eB = e; }
    const diffs = [];
    const said = e => (e.stack || e.message || String(e)).split('\n').slice(0, 4).join(' | ');
    if (eA || eB) diffs.push('game ' + (eA ? 'threw: ' + said(eA) : 'ran') + '; port ' + (eB ? 'threw: ' + said(eB) : 'ran'));
    else {
      const sA = snapshot(A), sB = snapshot(B);
      let nd = 0;
      // memory as the processor sees it below $C000, then every bank's 16 KB
      for (let a = 0x4000; a < 0xC000; a++) if (!sk[a] && A.M[a] !== B.M[a]) { if (nd++ < 10) diffs.push(hex(a) + ' game ' + hex2(A.M[a]) + ' port ' + hex2(B.M[a])); }
      for (const b of [0, 1, 3, 4, 6, 7]) {
        for (let i = 0; i < 0x4000; i++) {
          if (sk[0xC000 + i] || sA.banks[b][i] === sB.banks[b][i]) continue;
          if (nd++ < 10) diffs.push('bank ' + b + ' ' + hex(0xC000 + i) + ' game ' + hex2(sA.banks[b][i]) + ' port ' + hex2(sB.banks[b][i]));
        }
      }
      if (nd > 10) diffs.push('... ' + nd + ' bytes in all');
      if (sA.paging !== sB.paging) diffs.push('$7FFD game ' + hex2(sA.paging) + ' port ' + hex2(sB.paging));
      if (sA.log !== sB.log) {
        let i = 0;
        while (i < sA.log.length && sA.log[i] === sB.log[i]) i++;
        i = Math.max(0, sA.log.lastIndexOf(' ', i - 1));
        diffs.push('writes from ' + i + ': game [' + sA.log.slice(i, i + 200) + '] port [' + sB.log.slice(i, i + 200) + ']');
      }
      const rg = standin.regsOf(Object.assign({}, rA));
      for (const k of outs) {
        let v = rB[k];
        if (v === undefined && ['bc', 'de', 'hl'].includes(k) && rB[k[0]] !== undefined && rB[k[1]] !== undefined) v = rB[k[0]] << 8 | rB[k[1]];
        if (v === undefined && ['zf', 'cf', 'sf', 'pf'].includes(k) && rB.f !== undefined) v = standin.regsOf({ f: rB.f })[k];
        const g = k.length === 2 && k.endsWith('f') ? rg[k] : (k in rg ? rg[k] : rA[k]);
        if (v === undefined || (typeof g === 'boolean' ? !!v !== g : (v & 0xFFFF) !== (g & 0xFFFF))) diffs.push('register ' + k + ': game ' + g + ' port ' + v);
      }
    }
    if (diffs.length) {
      fails++;
      if (shown++ < (o.show || 3)) {
        console.log('  x case ' + k + ' (' + c.state + ', regs ' + NAMES.map(r => r + '=' + (c.regs[r] || 0).toString(16)).join(' ') + ' paging ' + c.paging.toString(16) + '):');
        for (const d of diffs) console.log('      ' + d);
      }
    }
  }
  console.log((fails ? 'FAIL ' : 'ok   ') + (o.name || hex(address)) + ': ' + (n - fails) + '/' + n + ' cases identical' + (n ? '' : ' (no cases: the sessions never called it)'));
  return { fails, cases: n };
}

module.exports = { check, entries, gather, prefetch, CaseIO, side };
