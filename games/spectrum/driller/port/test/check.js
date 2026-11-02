'use strict';
// A routine of the port checked alone against the game's own (kit/skills/core/70-minisite/play.md,
// "Test each routine alone first"), on the moments the game itself calls it: the machine is run on
// from the moments of play in work/states, and each time the program counter reaches the routine
// the whole machine is taken, registers, memory and the input as they stand. Each case then runs
// the game's routine on the kit's Z80 (standin.js, with nothing of the port in it) and the port's
// on P, each on its own copy, until it returns; and compares all of memory, the writes to the ULA
// in order, and the registers named in outs. setup(c, rnd) may change a case first: c.M (the
// 64 KB), c.regs. Routines the port has not written are the game's code on the port's side too.
//
//   const { check } = require('./check.js');
//   check({ name: 'mul_s8', outs: ['hl'], cases: 300 });
// Options: entry (an address, for a place that is not a label), states (a filter of state names),
// per (cases taken from each state, default 4), passes (how far to run from each state, default
// 40), play (how the player plays meanwhile: PLAY), most (how many states, spread over them,
// default 60), ignore (addresses or [first, last] ranges), show (failures printed), port (P => ...,
// run on the port's side before each case).
const path = require('path');
const lib = require('./lib.js');
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

// The machine around the processor for one side of a case: the input as it stood, and a log of the
// writes to the ULA.
class CaseIO {
  constructor(c) { this.keys = new Set(c.keys); this.joy = c.joy; this.ear = c.ear; this.border = c.border; this.log = []; }
  in(port) {
    if ((port & 0x20) === 0 && (port & 1)) return this.joy;
    if (port & 1) return 0xFF;
    const high = port >> 8;
    let v = 0x1F;
    for (const k of this.keys) if (!(high & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
    return 0xA0 | (this.ear << 6) | v;
  }
  out(port, v) {
    if (port & 1) return;
    this.border = v & 7; this.ear = (v >> 4) & 1;
    this.log.push('FE=' + v);
  }
}

// How the player plays from each state (o.play): a choice every 25 frames from a seeded sequence of
// keys: walking, turning, looking, firing, and nothing.
const KEYS = [['O'], ['K'], ['Q'], ['W'], ['P'], ['L'], ['O', 'Q'], ['O', 'W'], ['0'], ['R'], ['F'], [], []];
const PLAY = {
  still: () => {},
  mix: (m, i, k0) => {
    const slot = i / 25 | 0;
    let x = (k0 * 7919 + slot * 104729) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0x5bd1e995) >>> 0; x = (x ^ (x >>> 15)) >>> 0;
    m.releaseAll(); m.joy = 0;
    for (const k of KEYS[x % KEYS.length]) m.press(k);
  },
};
const cache = new Map();
const keyOf = (address, o, play) => address + ':' + (o.states || '') + ':' + (o.per || 4) + ':' + (o.passes || 40) + ':' + play;
function entries(address, o = {}) {
  const play = o.play || 'mix';
  const key = keyOf(address, o, play);
  if (!cache.has(key)) gather([address], o);
  return cache.get(key);
}
// The cases for several routines from one run of the sessions (each routine's are those it would
// have alone: the first `per` calls from each state).
function gather(where, o = {}) {
  const play = o.play || 'mix';
  where = where.filter(a => !cache.has(keyOf(a, o, play)));
  if (!where.length) return;
  const outs = where.map(() => []);
  const per = o.per || 4, passes = o.passes || 40, every = o.every || 1;
  const all = lib.states(typeof o.states === 'string' ? o.states : '');
  const most = o.most || 60, step = Math.max(1, all.length / most);
  for (let i = 0; i < all.length; i += step) {
    const f = all[Math.floor(i)];
    const m = lib.restore(lib.readState(f));
    const got = where.map(() => 0), seen = where.map(() => 0);
    where.forEach((address, j) => {
      const prev = m.hooks[address];
      m.hooks[address] = mm => {
        if (prev) prev(mm);
        if (got[j] >= per || seen[j]++ % every) return false;
        const cpu = mm.cpu, regs = {};
        for (const k of ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_']) regs[k] = cpu[k];
        outs[j].push({ M: mm.ram.slice(), regs, sp: cpu.sp, keys: [...mm.keys], joy: mm.joy, ear: mm.ear, border: mm.border, state: f });
        got[j]++;
        return false;
      };
    });
    const k0 = Math.floor(i);
    for (let n = 0; n < passes * 30 && got.some(g => g < per); n++) {
      PLAY[play](m, n, k0);
      m.runFrames(1);
    }
  }
  where.forEach((address, j) => {
    const list = typeof o.states === 'function' ? outs[j].filter(o.states) : outs[j];
    cache.set(keyOf(address, o, play), list);
  });
}
// gather by names and entries: ['name', 0x9447, ...]
function prefetch(names, o = {}) {
  const L = standin.labels();
  if (ONLY) names = names.filter(n => wanted(typeof n === 'number' ? { entry: n } : { name: n }));
  gather(names.map(n => {
    if (typeof n === 'number') return n;
    const a = L.byName.get(n);
    if (a === undefined) throw new Error('prefetch: no label ' + n);
    return a;
  }), o);
}

const hex = lib.hex, hex2 = v => '$' + (v & 255).toString(16).toUpperCase().padStart(2, '0');
const NAMES = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_'];

// One side of a case: P with the case's memory and machine; the game's side has no port.
function side(c, port) {
  const DR = loadPort();
  const M = c.M.slice();
  const cio = new CaseIO(c);
  const io = { in: p => cio.in(p), out: (p, v) => cio.out(p, v), irqByte: a => M[a], sp: (c.sp + 2) & 0xFFFF };
  const P = port ? DR.makePort(M, io) : DR.makePort(M, io, { only: [] });
  standin.install(P);
  return { P, M, log: cio.log, ioObj: cio };
}

// ONLY=name,name (or addresses in hex) in the environment checks just those
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wanted = o => !ONLY || ONLY.includes(o.name) || (o.entry !== undefined && ONLY.includes(o.entry.toString(16)));
function check(o) {
  if (!wanted(o)) return { fails: 0, cases: 0 };
  const L = standin.labels();
  let address;
  if (o.entry !== undefined) address = o.entry;
  else {
    address = L.byName.get(o.name);
    if (address === undefined) throw new Error('check: no label ' + o.name);
  }
  const list = o.cases0 || entries(address, o);
  const rnd = lib.makeRnd(o.seed || 1);
  const outs = o.outs || [];
  const skip = new Uint8Array(65536);
  for (const x of o.ignore || []) if (Array.isArray(x)) skip.fill(1, x[0], x[1] + 1); else skip[x] = 1;
  let fails = 0, shown = 0, n = 0;
  const cases = Math.min(o.cases || 300, o.setup ? Infinity : list.length);
  for (let k = 0; k < cases && list.length; k++) {
    const c0 = list[k % list.length];
    const c = { M: c0.M.slice(), regs: Object.assign({}, c0.regs), sp: c0.sp, keys: c0.keys, joy: c0.joy, ear: c0.ear, border: c0.border,
      state: c0.state };
    if (o.setup && o.setup(c, rnd) === false) continue;
    n++;
    // the stack below the entry's, never compared
    const sk = skip.slice();
    sk.fill(1, Math.max(0x4000, c.sp - 0x100), Math.min(0x10000, c.sp + 2));
    const A = side(c, false), B = side(c, true);
    if (o.port) o.port(B.P);
    let rA, rB, eA = null, eB = null;
    try { rA = A.P.at(address, Object.assign({}, c.regs)); } catch (e) { eA = e; }
    try {
      const name = o.entry !== undefined ? B.P.CODE[address] : o.name;
      if (!name || typeof B.P[name] !== 'function') throw new Error('the port has no ' + (name || hex(address)));
      const regs = standin.regsOf(Object.assign({}, c.regs));
      rB = B.P[name](regs);
      if (rB && typeof rB.next === 'function') { let y, g = 0; const it = rB; while (!(y = it.next()).done) if (++g > 1e6) throw new Error('never ended'); rB = y.value; }
      rB = rB || {};
    } catch (e) { eB = e; }
    const diffs = [];
    const said = e => (e.stack || e.message || String(e)).split('\n').slice(0, 4).join(' | ');
    if (eA || eB) diffs.push('game ' + (eA ? 'threw: ' + said(eA) : 'ran') + '; port ' + (eB ? 'threw: ' + said(eB) : 'ran'));
    else {
      let nd = 0;
      for (let a = 0x4000; a < 0x10000; a++) if (!sk[a] && A.M[a] !== B.M[a]) { if (nd++ < 10) diffs.push(hex(a) + ' game ' + hex2(A.M[a]) + ' port ' + hex2(B.M[a])); }
      if (nd > 10) diffs.push('... ' + nd + ' bytes in all');
      const lA = A.log.join(' '), lB = B.log.join(' ');
      if (lA !== lB) {
        let i = 0;
        while (i < lA.length && lA[i] === lB[i]) i++;
        i = Math.max(0, lA.lastIndexOf(' ', i - 1));
        diffs.push('writes from ' + i + ': game [' + lA.slice(i, i + 200) + '] port [' + lB.slice(i, i + 200) + ']');
      }
      const rg = standin.regsOf(Object.assign({}, rA));
      // what the port's routine leaves out it kept: the registers it was given
      const kept = standin.regsOf(Object.assign({}, c.regs));
      const rB2 = Object.assign({}, rB);
      for (const [p, hi, lo] of [['bc', 'b', 'c'], ['de', 'd', 'e'], ['hl', 'h', 'l']]) {
        if (rB2[p] !== undefined) { if (rB2[hi] === undefined) rB2[hi] = rB2[p] >> 8 & 255; if (rB2[lo] === undefined) rB2[lo] = rB2[p] & 255; }
      }
      for (const k of Object.keys(kept)) if (rB2[k] === undefined && !(['zf', 'cf', 'sf', 'pf'].includes(k) && rB2.f !== undefined)) rB2[k] = kept[k];
      for (const k of outs) {
        let v = rB2[k];
        if (['bc', 'de', 'hl'].includes(k)) v = rB2[k[0]] << 8 | rB2[k[1]];
        if (v === undefined && ['zf', 'cf', 'sf', 'pf'].includes(k) && rB2.f !== undefined) v = standin.regsOf({ f: rB2.f })[k];
        const g = k.length === 2 && k.endsWith('f') ? rg[k] : (k in rg ? rg[k] : rA[k]);
        if (v === undefined || (typeof g === 'boolean' ? !!v !== g : (v & 0xFFFF) !== (g & 0xFFFF))) diffs.push('register ' + k + ': game ' + g + ' port ' + v);
      }
    }
    if (diffs.length) {
      fails++;
      if (shown++ < (o.show || 3)) {
        console.log('  x case ' + k + ' (' + c.state + ', regs ' + NAMES.map(r => r + '=' + (c.regs[r] || 0).toString(16)).join(' ') + '):');
        for (const d of diffs) console.log('      ' + d);
      }
    }
  }
  console.log((fails ? 'FAIL ' : 'ok   ') + (o.name || hex(address)) + ': ' + (n - fails) + '/' + n + ' cases identical' + (n ? '' : ' (no cases: the sessions never called it)'));
  return { fails, cases: n };
}

module.exports = { check, entries, gather, prefetch, CaseIO, side, PLAY };
