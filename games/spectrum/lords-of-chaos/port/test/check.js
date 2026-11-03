'use strict';
// A routine of the port checked alone against the game's own (kit/skills/core/70-minisite/play.md,
// "Test each routine alone first"), on the moments the game itself calls it: the machine is run on
// from the moments of play in work/states, and each time the program counter reaches the routine
// the whole machine is taken, registers, memory and the input as they stand. Each case then runs
// the game's routine on the kit's Z80 (standin.js, with nothing of the port in it) and the port's
// on P, each on its own copy, until it returns; and compares all of memory, the writes to the ULA
// in order, and the registers named in outs. A routine that waits runs as a generator on both
// sides, each to its end, the input held as the case took it (or changed by c.seq). The refresh
// register reads a seeded sequence, the same on both sides. setup(c, rnd) may change a case
// first: c.M (the 64 KB), c.regs. Routines the port has not written are the game's code on the
// port's side too.
//
//   const { check } = require('./check.js');
//   check({ name: 'distance', outs: ['a'], cases: 300 });
// Options: entry (an address, for a place that is not a label), states (a filter of state names),
// per (cases taken from each state, default 4), frames (how far to run from each state, default
// 1500), most (how many states, spread over them, default 60), from (a routine whose moments are
// taken instead), timed (the T-states between writes to the ULA compared too), tape (c => a tape
// for each side), ignore (addresses or [first, last] ranges), show (failures printed), port (P =>
// ..., run on the port's side before each case), limit (yields a generator may make, default
// 200,000).
const path = require('path'), fs = require('fs');
const lib = require('./lib.js');
const standin = require('./standin.js');
const { loadPort } = require('./port.js');
const { player } = require('./sessions.js');

// The machine around the processor for one side of a case: the input as it stood, and a log of the
// writes to the ULA. c.seq, when a case has it, is the keys held as the keyboard is read:
// [{ keys, scans }], each held for that many reads of the half-row $FEFE ... (any read of port $FE
// with A8 low counts), the last for good.
class CaseIO {
  constructor(c) {
    this.keys = new Set(c.keys); this.joy = c.joy || 0; this.ear = c.ear || 0; this.border = c.border; this.log = []; this.times = [];
    this.seq = c.seq ? c.seq.map(s => ({ keys: new Set(s.keys), scans: s.scans })) : null; this.scan = 0;
  }
  in(port) {
    if (this.seq && (port & 1) === 0 && !((port >> 8) & 1)) {
      let n = this.scan++;
      for (const s of this.seq) { this.keys = s.keys; if (n < s.scans) break; n -= s.scans; }
    }
    if ((port & 0x20) === 0 && (port & 1)) return this.joy;
    if (port & 1) return 0xFF;
    const high = port >> 8;
    let v = 0x1F;
    for (const k of this.keys) if (!(high & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
    return 0xA0 | (this.ear << 6) | v;
  }
  out(port, v, t) {
    if (port & 1) return;
    this.border = v & 7; this.ear = (v >> 4) & 1;
    this.log.push('FE=' + v);
    this.times.push(typeof t === 'number' ? t : NaN);
  }
}

const cache = new Map();
const keyOf = (address, o) => address + ':' + (o.states || '') + ':' + (o.per || 4) + ':' + (o.frames || 1500);
const CASES = path.join(lib.GAME, 'work', 'cases');
const fileOf = key => path.join(CASES, key.replace(/[^0-9A-Za-z]+/g, '_') + '.bin');
function load(key) {
  const f = fileOf(key);
  if (process.env.CASES === 'fresh' || !fs.existsSync(f)) return;
  const buf = fs.readFileSync(f), n = buf.readUInt32LE(0), head = JSON.parse(buf.slice(4, 4 + n).toString());
  let at = 4 + n;
  cache.set(key, head.map(h => { const M = new Uint8Array(buf.buffer.slice(buf.byteOffset + at, buf.byteOffset + at + 65536)); at += 65536; return Object.assign(h, { M }); }));
}
function save(key, list) {
  fs.mkdirSync(CASES, { recursive: true });
  const head = Buffer.from(JSON.stringify(list.map(c => Object.assign({}, c, { M: undefined }))));
  const n = Buffer.alloc(4); n.writeUInt32LE(head.length, 0);
  fs.writeFileSync(fileOf(key), Buffer.concat([n, head, ...list.map(c => Buffer.from(c.M.buffer, c.M.byteOffset, 65536))]));
}
// The cases for several routines from one run of the sessions: the first `per` calls from each state.
function gather(where, o = {}) {
  for (const a of where) if (!cache.has(keyOf(a, o))) load(keyOf(a, o));
  where = where.filter(a => !cache.has(keyOf(a, o)));
  if (!where.length) return;
  const outs = where.map(() => []);
  const per = o.per || 4, frames = o.frames || 1500;
  const all = lib.states(typeof o.states === 'string' ? o.states : '');
  const most = o.most || 60, step = Math.max(1, all.length / most);
  for (let i = 0; i < all.length; i += step) {
    const f = all[Math.floor(i)];
    const m = lib.restore(lib.readState(f));
    const got = where.map(() => 0);
    let inInt = -1;
    where.forEach((address, j) => {
      const prev = m.hooks[address];
      m.hooks[address] = mm => {
        if (prev && prev(mm) === true) return true;
        if (got[j] >= per) return false;
        const cpu = mm.cpu, regs = {};
        for (const k of ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_']) regs[k] = cpu[k];
        outs[j].push({ M: mm.ram.slice(), regs, sp: cpu.sp, keys: [...mm.keys], joy: mm.joy, ear: mm.ear, border: mm.border, state: f,
          iff1: cpu.iff1, im: cpu.im, i: cpu.i, tape: mm.tape.save_() });
        got[j]++;
        return false;
      };
    });
    const input = player(lib.makeRnd(Math.floor(i) * 7919 + 1), m);
    for (let n = 0; n < frames && got.some(g => g < per); n++) { input.frame(n, m); input.check(m); m.runFrames(1); }
  }
  where.forEach((address, j) => {
    const list = typeof o.states === 'function' ? outs[j].filter(o.states) : outs[j];
    cache.set(keyOf(address, o), list);
    if (typeof o.states !== 'function') save(keyOf(address, o), list);
  });
}
function entries(address, o = {}) {
  const key = keyOf(address, o);
  if (!cache.has(key)) load(key);
  if (!cache.has(key)) gather([address], o);
  return cache.get(key);
}
// gather by names and entries: ['name', 0x9447, ...]
function prefetch(names, o = {}) {
  if (ONLY) names = names.filter(n => wanted(typeof n === 'number' ? { entry: n } : { name: n }));
  gather(names.map(n => (typeof n === 'number' ? n : addressOf(n, o))), o);
}
// a label's address: the engine's, or in o.part's code above it
function addressOf(name, o = {}) {
  const L = standin.labels();
  let a = L.byName.get(name);
  if (a === undefined && o.part !== undefined) a = L.up[o.part].get(name);
  if (a === undefined) throw new Error('check: no label ' + name + (o.part !== undefined ? ' in part ' + o.part : ''));
  return a;
}

const hex = lib.hex, hex2 = v => '$' + (v & 255).toString(16).toUpperCase().padStart(2, '0');
const NAMES = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_'];

// One side of a case: P with the case's memory and machine; the game's side has no port.
function side(c, port, o) {
  const LOC = loadPort();
  const M = c.M.slice();
  const cio = new CaseIO(c);
  const rr = lib.makeRnd(c.rseed || 77);
  const io = { in: p => cio.in(p), out: (p, v, t) => cio.out(p, v, t), irqByte: a => M[a], readR: () => rr(256), sp: (c.sp + 2) & 0xFFFF };
  io.tape = o.tape ? o.tape(c) : (c.tape ? lib.Tape.from(c.tape) : lib.gameTape());
  const P = port ? LOC.makePort(M, io) : LOC.makePort(M, io, { only: [] });
  P.part = lib.partOf(c.M);
  standin.install(P);
  return { P, M, log: cio.log, ioObj: cio };
}
// run a routine to its end: a generator to its return, every yield passed over
function finish(r, limit) {
  if (r && typeof r.next === 'function') {
    let y, g = 0;
    while (!(y = r.next()).done) if (++g > limit) throw new Error('never ended (' + limit + ' yields)');
    return y.value || {};
  }
  return r || {};
}

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wanted = o => !ONLY || ONLY.includes(o.name) || (o.entry !== undefined && ONLY.includes(o.entry.toString(16)));
function check(o) {
  if (!wanted(o)) return { fails: 0, cases: 0 };
  const address = o.entry !== undefined ? o.entry : addressOf(o.name, o);
  const list = o.cases0 || (o.from ? entries(addressOf(o.from, o), o) : entries(address, o));
  const rnd = lib.makeRnd(o.seed || 1);
  const outs = o.outs || [];
  const skip = new Uint8Array(65536);
  for (const x of o.ignore || []) if (Array.isArray(x)) skip.fill(1, x[0], x[1] + 1); else skip[x] = 1;
  let fails = 0, shown = 0, n = 0, endlessN = 0;
  const limit = o.limit || 200000;
  const cases = Math.min(o.cases || 300, o.setup ? Infinity : list.length);
  for (let k = 0; k < cases && list.length; k++) {
    const c0 = list[k % list.length];
    const c = Object.assign({}, c0, { M: c0.M.slice(), regs: Object.assign({}, c0.regs), rseed: k + 1 });
    if (o.setup && o.setup(c, rnd) === false) continue;
    n++;
    // the stack below the entry's, never compared
    const sk = skip.slice();
    sk.fill(1, Math.max(0x4000, c.sp - 0x100), Math.min(0x10000, c.sp + 2));
    const A = side(c, false, o), B = side(c, true, o);
    if (o.port) o.port(B.P);
    let rA, rB, eA = null, eB = null;
    try { rA = finish(A.P.nameAt(address) && A.P.GEN.has(A.P.nameAt(address)) ? A.P.atGen(address, Object.assign({}, c.regs)) : A.P.at(address, Object.assign({}, c.regs)), limit); } catch (e) { eA = e; }
    try {
      const name = o.entry !== undefined ? B.P.nameAt(address) : o.name;
      if (!name || typeof B.P[name] !== 'function' || B.P.standIns.has(name)) throw new Error('the port has no ' + (name || hex(address)));
      rB = finish(B.P[name](standin.regsOf(Object.assign({}, c.regs))), limit);
    } catch (e) { eB = e; }
    const diffs = [];
    const said = e => (e.stack || e.message || String(e)).split('\n').slice(0, 5).join(' | ');
    // a drop of return addresses (P.Unwind) ends a routine as a return does: the drops and where
    // they end must agree, then the memory and registers are compared as for a return
    const unw = e => e && A.P.Unwind && (e instanceof A.P.Unwind || e instanceof B.P.Unwind || e.constructor.name === 'Unwind');
    if (unw(eA) && unw(eB)) {
      if (eA.n !== eB.n || eA.then !== eB.then) diffs.push('game drops ' + eA.n + ' to ' + eA.then + ', port ' + eB.n + ' to ' + eB.then);
      rA = eA.r; rB = eB.r; eA = eB = null;
    }
    // waiting on input that never comes, on both sides: not compared
    const endless = e => e && /never ended|no return in/.test(e.message || '');
    if (endless(eA) && endless(eB)) { endlessN++; continue; }
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
      if (o.timed && !diffs.length) {
        const tA = A.ioObj.times, tB = B.ioObj.times;
        for (let i = 1; i < tA.length && i < tB.length; i++) {
          const dA = tA[i] - tA[i - 1], dB = tB[i] - tB[i - 1];
          if (dA !== dB) { diffs.push('write ' + i + ' of ' + tA.length + ': ' + dA + ' T-states after the one before in the game, ' + dB + ' in the port'); break; }
        }
      }
      if (o.tapeOut && JSON.stringify(A.P.io.tape.save_()) !== JSON.stringify(B.P.io.tape.save_())) diffs.push('the tapes differ');
      const rg = standin.regsOf(Object.assign({}, rA));
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
  console.log((fails ? 'FAIL ' : 'ok   ') + (o.name || hex(address)) + ': ' + (n - fails - endlessN) + '/' + (n - endlessN) + ' cases identical' +
    (endlessN ? ' (' + endlessN + ' waiting for input on both sides, not compared)' : '') + (n ? '' : ' (no cases: the sessions never called it)'));
  return { fails, cases: n };
}

module.exports = { check, entries, gather, prefetch, CaseIO, side, addressOf };
