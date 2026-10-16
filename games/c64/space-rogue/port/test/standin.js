'use strict';
// The game's own code standing in for the routines the port has not written yet, in the tests only
// (kit/c64/lockstep.js's standIn, made for this game): the kit's simulator on P's memory and chips,
// with the processor port as P keeps it in M[1], the KERNAL's routines served by the port's own
// (src/kernal.js), and every routine the port has written, but those that wait, run as the port's
// when the game's code calls it. A routine that waits cannot stand in: nothing moves while it runs.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { CPU } = require(path.join(lib.REPO, 'kit/c64/cpu6502.js'));

// The code labels of the parts in memory together (flight: the engine and SEG0), by name.
function labels(parts) {
  const out = new Map();
  for (const part of parts) {
    const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', part, 'listing.json'), 'utf8'));
    for (const r of L.records) if (r.t === 'code' && r.l && !out.has(r.l)) out.set(r.l, r.a);
  }
  return out;
}

const KERNAL = { 0xFF90: 'SETMSG', 0xFFB7: 'READST', 0xFFBA: 'SETLFS', 0xFFBD: 'SETNAM', 0xFFD5: 'LOAD', 0xFFD8: 'SAVE',
  0xFFC0: 'OPEN', 0xFFC3: 'CLOSE', 0xFFC6: 'CHKIN', 0xFFCC: 'CLRCHN', 0xFFE7: 'CLALL', 0xFFCF: 'CHRIN' };
const regsOf = c => ({ a: c.a, x: c.x, y: c.y, n: c.n, v: c.v, z: c.z, c: c.c });

// The simulator reading the interrupt's bytes through P.irqByte, as the port's own code does, so
// that a stand-in sees what the game's code read there (kit/c64/lockstep.js, irqBytes).
function standInCpu(P, irqBytes) {
  const B = new Uint8Array(65536);
  for (const a of irqBytes) B[a] = 1;
  class StandInCPU extends CPU {
    rd(a) { return B[a] && this.rk[a >>> 8] === 0 ? P.irqByte(a) : super.rd(a); }
    rdz(a) { return B[a] ? P.irqByte(a) : super.rdz(a); }
  }
  return new StandInCPU(P.M, { port: { dir: 0x2F, data: P.M[1] }, io: { read: x => P.io.read(x), write: (x, v) => P.io.write(x, v) } });
}

// The KERNAL's routines the game calls, served by P's (src/kernal.js) on P's memory and disk, as
// hooks for the kit's simulator: for the stand-ins, and for the game's own code in check.js.
function kernalHooks(P) {
  const hooks = {};
  const kernalIn = c => (c.pdata | ~c.pdir) & 2;
  for (const [a, name] of Object.entries(KERNAL)) {
    hooks[a] = c => {
      if (!kernalIn(c)) return false;
      const r = P.kernal[name](regsOf(c));
      c.setRegs(r); c.rts();
      return false;
    };
  }
  return hooks;
}

// Fill P with stand-ins for every label the port has not written. ported: the names it has.
function install(P, names, irqBytes = []) {
  const ported = new Set(Object.keys(P).filter(k => typeof P[k] === 'function'));
  // a routine that waits is a generator, and GEN names it, so that a stand-in for it is one too
  for (const k of ported) {
    const gen = P[k].constructor.name === 'GeneratorFunction';
    if (gen !== P.GEN.has(k)) throw new Error(k + (gen ? ' is a generator that GEN leaves out' : ' is in GEN but is not a generator'));
  }
  const hooks = kernalHooks(P);
  for (const [label, a] of names) {
    if (!ported.has(label) || P.GEN.has(label)) continue;
    const f = P[label];
    hooks[a] = c => {
      P.M[1] = c.pdata;
      const r0 = regsOf(c), sp = c.sp;
      const r = f.call(P, Object.assign({}, r0)) || {};
      // the registers it gives back; the rest as they were on entry (a stand-in it called may
      // have changed them)
      const out = Object.assign({}, r0);
      for (const k of Object.keys(out)) if (r[k] !== undefined) out[k] = typeof r[k] === 'boolean' ? +r[k] : r[k];
      c.setRegs(out);
      c.sp = sp;
      c.portWrite(1, P.M[1]);
      // a routine that drops its caller's return address (PLA PLA, then RTS) returns from its
      // caller too, with the address's high byte in A
      if (r.up) { c.pull(); const hi = c.pull(); c.setRegs({ a: hi, n: hi >> 7, z: hi ? 0 : 1 }); }
      c.rts();
      return false;
    };
  }
  // A stand-in called from a ported routine that a stand-in called runs on, deeper in the same
  // stack, as the game's code would.
  let cpu = null, depth = 0;
  P.standIns = new Set();
  for (const [label, a] of names) {
    if (ported.has(label)) continue;
    P.standIns.add(label);
    const run = function (r) {
      if (!cpu) cpu = standInCpu(P, irqBytes);
      const regs = { d: 0 };
      r = r || {};
      for (const k of ['a', 'x', 'y', 'n', 'v', 'z', 'c']) if (r[k] !== undefined) regs[k] = r[k];
      if (depth) regs.sp = cpu.sp;
      cpu.portWrite(0, 0x2F); cpu.portWrite(1, P.M[1]);
      depth++;
      try { cpu.call(a, regs, { hooks, maxSteps: 5e6 }); } finally { depth--; }
      P.M[1] = cpu.pdata;
      return regsOf(cpu);
    };
    P[label] = P.GEN.has(label) ? function* (r) { return run(r); } : run;
  }
  return P;
}

module.exports = { labels, install, kernalHooks };
