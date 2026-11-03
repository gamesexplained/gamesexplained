'use strict';
// The game's own code standing in for the routines the port has not written yet, in the tests only:
// the kit's Z80 on P.M through P.io, and every routine the port has written run as the port's when
// the game's code reaches its entry (by a CALL, a JP or running on into it), with a RET after.
//
// A routine that waits (it reads the controls through read_controls at $622B, the keyboard through
// the ROM's KEY-SCAN at $028E, or halts at $829A, or calls one that does) stands in as a generator:
// at each of those places it yields as the port's own would ({ cp: $622B }, { cp: $028E },
// { halt: true }) and runs on, so the whole program runs in lockstep with nothing of it ported.
// Which routines wait is worked out from the listings (waits() below): the routines that reach one
// of those places by a CALL or a JP, or by running on, in the engine or in any of the parts that
// load above it, and those that jump through a table of routines that do (JP (HL) in the menus,
// the spells, the computer's steps and the designer). A routine that does not wait stands in as a
// plain function, and stops the run if its code ever reaches a routine that waits.
//
// The registers a routine is given and gives back (core.js): a, f, b, c, d, e, h, l, ix, iy, af_,
// bc_, de_, hl_, the pairs bc, de and hl, and the flags zf, cf, sf and pf as booleans.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { CPU } = require(path.join(lib.ROOT, 'kit/spectrum/z80.js'));

const PARTS = ['engine', 'designer', 'scenario-1', 'scenario-2', 'scenario-3'];
const PART_NO = { designer: 0, 'scenario-1': 1, 'scenario-2': 2, 'scenario-3': 3 };
const READ_CONTROLS = 0x622B, KEY_SCAN = 0x028E, HALT_EXIT = 0x829B, R_READ = 0xA738;

// Each part's code labels and instructions.
let INFO = null;
function info() {
  if (INFO) return INFO;
  INFO = {};
  for (const p of PARTS) {
    const recs = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', p, 'listing.json'), 'utf8')).records;
    const names = new Map(), code = [];
    for (const r of recs) {
      if (r.l) names.set(r.l, r.a);
      if (r.t === 'code') code.push(r);
    }
    const labels = new Map();
    for (const r of code) if (r.l) labels.set(r.l, r.a);
    INFO[p] = { names, code, labels };
  }
  return INFO;
}
// The labels the port names: the engine's (byName, byAddress) and each upper part's (up[n]).
let LABELS = null;
function labels() {
  if (LABELS) return LABELS;
  const I = info();
  LABELS = { byName: new Map(), byAddress: new Map(), up: { 0: new Map(), 1: new Map(), 2: new Map(), 3: new Map() } };
  for (const [l, a] of I.engine.labels) { LABELS.byName.set(l, a); LABELS.byAddress.set(a, l); }
  for (const p of PARTS.slice(1)) {
    for (const [l, a] of I[p].labels) {
      if (a < 0xD003) continue;
      LABELS.up[PART_NO[p]].set(l, a);
    }
  }
  return LABELS;
}

// The routines that wait, by label, over the engine and every upper part.
let WAITS = null;
function waits() {
  if (WAITS) return WAITS;
  const I = info();
  const seed = new Set(['read_controls', 'key_scan']);
  const edges = new Map();            // label -> labels it reaches
  const add = (from, to) => { if (!edges.has(to)) edges.set(to, new Set()); edges.get(to).add(from); };
  for (const p of PARTS.slice(1)) {
    const code = I.engine.code.concat(I[p].code.filter(r => r.a >= 0xD003)).sort((x, y) => x.a - y.a);
    const names = new Map([...I.engine.names, ...I[p].names]);
    const starts = code.filter(r => r.l).map(r => [r.a, r.l]);
    const owner = a => { let o = null; for (const [s, l] of starts) { if (s > a) break; o = l; } return o; };
    const entry = new Map(starts.map(([a, l]) => [a, l]));
    let cur = null;
    for (let i = 0; i < code.length; i++) {
      const r = code[i];
      if (r.l) {
        // running on into a label from the instruction before
        const prev = code[i - 1];
        if (cur && prev && prev.a + (prev.b ? prev.b.length : 1) === r.a && !/^(ret|reti|retn)$/.test(prev.m || '') &&
          !(/^(jp|jr)$/.test(prev.m || '') && !/,/.test(prev.o || ''))) add(cur, r.l);
        cur = r.l;
      }
      const m = r.m || '', o = r.o || '';
      if (m === 'halt') add(cur, 'key_scan');
      if (m === 'jp' && /^\((hl|ix|iy)\)$/.test(o) && cur !== 'read_controls' && cur !== 'highlight_file_option') add(cur, 'key_scan');
      if (!/^(call|jp|jr|djnz)$/.test(m)) continue;
      const tok = o.split(',').pop().trim();
      let t = /^\$[0-9A-F]{4}$/.test(tok) ? parseInt(tok.slice(1), 16) : names.get(tok);
      if (t === undefined) continue;
      if (t === KEY_SCAN) { add(cur, 'key_scan'); continue; }
      if (t < 0x4000) continue;
      const to = entry.get(t) || owner(t);
      if (to && to !== cur) add(cur, to);
    }
  }
  WAITS = new Set(seed);
  const stack = [...seed];
  while (stack.length) for (const f of edges.get(stack.pop()) || []) if (!WAITS.has(f)) { WAITS.add(f); stack.push(f); }
  return WAITS;
}

const S = 0x80, Z = 0x40, PV = 0x04, C = 0x01;
const R8 = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l'], R16 = ['ix', 'iy', 'af_', 'bc_', 'de_', 'hl_'];
function regsOf(cpu) {
  const r = {};
  for (const k of R8) r[k] = cpu[k] & 255;
  for (const k of R16) r[k] = cpu[k] & 0xFFFF;
  r.bc = r.b << 8 | r.c; r.de = r.d << 8 | r.e; r.hl = r.h << 8 | r.l;
  r.zf = !!(r.f & Z); r.cf = !!(r.f & C); r.sf = !!(r.f & S); r.pf = !!(r.f & PV);
  return r;
}
function setRegs(cpu, r) {
  for (const [p, hi, lo] of [['bc', 'b', 'c'], ['de', 'd', 'e'], ['hl', 'h', 'l']]) {
    if (r[p] !== undefined) { cpu[hi] = (r[p] >> 8) & 255; cpu[lo] = r[p] & 255; }
  }
  for (const k of R8) if (r[k] !== undefined) cpu[k] = r[k] & 255;
  for (const k of R16) if (r[k] !== undefined) cpu[k] = r[k] & 0xFFFF;
  let f = cpu.f;
  for (const [k, bit] of [['zf', Z], ['cf', C], ['sf', S], ['pf', PV]]) if (r[k] !== undefined) f = r[k] ? f | bit : f & ~bit;
  cpu.f = f;
}

class StandInCPU extends CPU {
  constructor(P) { super(P.M, { io: { in: p => P.io.in(p), out: (p, v) => P.io.out(p, v) } }); this.P = P; }
  wr(a, v) { const n = this.resolve(a); this.tstates += 3; if (n >= 0x4000) this.m[n] = v & 0xFF; }
  // a byte the interrupt writes, as the game read it (P.io.irqByte); P.countdown, for a test of a
  // routine that waits on a counter the interrupt runs down
  rd(a) {
    const n = this.resolve(a), P = this.P;
    this.tstates += 3;
    if (P.IRQ && P.IRQ.has(n)) return P.irqByte(n);
    const v = this.m[n];
    if (P.countdown === n && v) this.m[n] = v - 1;
    return v;
  }
}

// LD-BYTES and SA-BYTES on the port's tape (lib.js's tapeHook): false when the tape has ended, and
// the ROM's own loop waits for SPACE.
function romTape(cpu, tape, at) {
  const ix = cpu.ix, de = cpu.d << 8 | cpu.e;
  let ok;
  if (at === 0x04C6) {
    ok = tape.save(cpu.a, cpu.m.slice(ix, ix + de));
    cpu.ix = (ix + de) & 0xFFFF; cpu.d = cpu.e = 0;
  } else {
    if (tape.pos >= tape.blocks.length) return false;
    const flag = cpu.af_ >> 8, b = tape.load(flag, de);
    if (b.flag !== flag) ok = false;
    else {
      const k = Math.min(de, b.bytes.length);
      for (let i = 0; i < k; i++) cpu.m[(ix + i) & 0xFFFF] = b.bytes[i];
      ok = b.bytes.length === de;
      cpu.ix = (ix + k) & 0xFFFF; const left = de - k; cpu.d = left >> 8; cpu.e = left & 255;
    }
  }
  cpu.f = ok ? cpu.f | C : cpu.f & ~C;
  cpu.pc = cpu.pop();
  return true;
}

// Fill P with stand-ins for every label the port has not written.
function install(P) {
  const L = labels(), W = waits();
  const portedAt = a => {
    const k = a >= 0xD003 ? P.UP[P.part][a] : (a === KEY_SCAN ? P.CODE[a] : P.CODE[a]);
    return k && typeof P[k] === 'function' && !P.standIns.has(k) ? k : null;
  };
  P.standIns = new Set();
  P.standInsUsed = new Set();
  const active = [];                  // the stand-ins running, innermost last
  // one run of the game's code from a, as a generator; sync: a plain run, which may not wait
  function* run(label, a, r, sync) {
    P.standInsUsed.add(label);
    const cpu = new StandInCPU(P);
    const outer = active[active.length - 1];
    const sp0 = outer ? (outer.sp - 2) & 0xFFFF : P.io.sp;
    if (sp0 === undefined) throw new Error('standIn ' + label + ': no stack pointer (P.io.sp)');
    if (outer) { cpu.iff1 = outer.iff1; cpu.iff2 = outer.iff2; cpu.im = outer.im; cpu.i = outer.i; }
    if (r) setRegs(cpu, r);
    cpu.sp = sp0;
    cpu.push(0);
    cpu.t0 = cpu.tstates;
    cpu.pc = a;
    active.push(cpu);
    try {
      for (let n = 0; cpu.pc !== 0 || cpu.sp !== sp0; n++) {
        if (n > 2e7) throw new Error('standIn ' + label + ': no return in 20,000,000 instructions');
        const pc = cpu.pc;
        const k = pc !== a || n ? portedAt(pc) : null;
        if (k !== null) {
          let out;
          if (P.GEN.has(k)) {
            if (sync) throw new Error('standIn ' + label + ' reached ' + k + ', which waits');
            out = yield* P[k](regsOf(cpu));
            cpu.t0 = cpu.tstates;
          } else out = P[k](regsOf(cpu));
          setRegs(cpu, out || {});
          cpu.pc = cpu.pop();
          continue;
        }
        if (pc === READ_CONTROLS || pc === KEY_SCAN) {
          if (sync) throw new Error('standIn ' + label + ' reached ' + lib.hex(pc) + ', which waits');
          // the time since the last yield first: two checkpoints at the same place with nothing
          // yielded between are one to the lockstep
          const t = cpu.tstates - cpu.t0;
          if (t > 0) yield { tstates: t };
          yield { cp: pc };
          cpu.t0 = cpu.tstates;
        }
        if ((pc === 0x0562 || pc === 0x04C6) && P.io.tape && romTape(cpu, P.io.tape, pc)) continue;
        if (pc === R_READ) { cpu.a = P.readR() & 255; cpu.pc = R_READ + 2; continue; }
        cpu.step();
        if (cpu.halted) {
          if (sync) throw new Error('standIn ' + label + ' halted at ' + lib.hex(cpu.pc));
          cpu.halted = 0;
          yield { halt: true };
          cpu.t0 = cpu.tstates;
        }
      }
    } finally { active.pop(); }
    const out = regsOf(cpu);
    if (outer) { outer.iff1 = cpu.iff1; outer.iff2 = cpu.iff2; outer.im = cpu.im; outer.i = cpu.i; }
    return out;
  }
  const syncCall = (label, a) => function (r) {
    const it = run(label, a, r, true);
    const y = it.next();
    if (!y.done) throw new Error('standIn ' + label + ' yielded');
    const out = y.value;
    Object.defineProperty(out, Symbol.iterator, { value: function* () { return out; } });
    return out;
  };
  const genCall = (label, a) => function* (r) { return yield* run(label, a, r, false); };
  const make = (label, a) => (W.has(label) ? genCall(label, a) : syncCall(label, a));
  const ported = name => typeof P[name] === 'function';
  // a routine the port has written that the game's code says waits must be a generator, or what it
  // calls that waits never runs
  for (const label of W) if (ported(label) && !P.GEN.has(label)) throw new Error('the port\'s ' + label + ' waits in the game: it must be a generator');
  for (const [label, a] of L.byName) {
    if (ported(label)) continue;
    P.standIns.add(label);
    P[label] = make(label, a);
    P.CODE[a] = label;
    if (W.has(label)) P.GEN.add(label);
  }
  // the upper parts' routines: P[label] stands in for the part loaded, by its own address there
  const upNames = new Set();
  for (const n of [0, 1, 2, 3]) for (const [label] of L.up[n]) upNames.add(label);
  for (const label of upNames) {
    if (ported(label)) continue;
    P.standIns.add(label);
    const gen = W.has(label);
    const at = () => { const a = L.up[P.part].get(label); if (a === undefined) throw new Error('standIn ' + label + ': not in part ' + P.part); return a; };
    P[label] = gen ? function* (r) { return yield* run(label, at(), r, false); } : function (r) { return syncCall(label, at())(r); };
    if (gen) P.GEN.add(label);
    for (const n of [0, 1, 2, 3]) { const a = L.up[n].get(label); if (a !== undefined) P.UP[n][a] = label; }
  }
  // KEY-SCAN, the ROM's
  if (!ported('key_scan')) { P.standIns.add('key_scan'); P.key_scan = genCall('key_scan', KEY_SCAN); P.GEN.add('key_scan'); }
  // an entry that is not a label
  P.at = (a, r) => syncCall('$' + a.toString(16), a)(r);
  P.atGen = function* (a, r) { return yield* run('$' + a.toString(16), a, r, false); };
  return P;
}

module.exports = { labels, waits, install, regsOf, setRegs, info, READ_CONTROLS, KEY_SCAN, HALT_EXIT };
