'use strict';
// The game's own code standing in for the routines the port has not written yet, in the tests only
// (kit/c64/lockstep.js's standIn, made for this game): the kit's simulator on P's memory and chips,
// with the processor port as P keeps it in M[1], and every routine the port has written, but those
// that wait, run as the port's when the game's code calls it. A routine that waits cannot stand in:
// nothing moves while it runs.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { CPU } = require(path.join(lib.REPO, 'kit/c64/cpu6502.js'));

// The listing's code labels, by name.
let LABELS = null;
function labels() {
  if (!LABELS) {
    LABELS = new Map();
    const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'listing.json'), 'utf8'));
    for (const r of L.records) if (r.t === 'code' && r.l && !LABELS.has(r.l)) LABELS.set(r.l, r.a);
  }
  return LABELS;
}
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

// Fill P with stand-ins for every label the port has not written; hooks in the game's code for
// those it has, so a stand-in calls the port's. ported: the names P has as functions.
function install(P, irqBytes = []) {
  const names = labels();
  const ported = new Set(Object.keys(P).filter(k => typeof P[k] === 'function' && names.has(k)));
  for (const k of ported) {
    const gen = P[k].constructor.name === 'GeneratorFunction';
    if (gen !== P.GEN.has(k)) throw new Error(k + (gen ? ' is a generator that GEN leaves out' : ' is in GEN but is not a generator'));
  }
  const hooks = {};
  for (const [label, a] of names) {
    if (!ported.has(label) || P.GEN.has(label)) continue;
    const f = P[label];
    hooks[a] = c => {
      P.M[1] = c.pdata;
      const r0 = regsOf(c), sp = c.sp;
      const r = f.call(P, Object.assign({}, r0)) || {};
      const out = Object.assign({}, r0);
      for (const k of Object.keys(out)) if (r[k] !== undefined) out[k] = typeof r[k] === 'boolean' ? +r[k] : r[k];
      c.setRegs(out);
      c.sp = sp;
      c.portWrite(1, P.M[1]);
      c.rts();
      return false;
    };
  }
  let cpu = null, depth = 0;
  P.standIns = new Set();
  P.standInsUsed = new Set();
  for (const [label, a] of names) {
    if (ported.has(label)) continue;
    P.standIns.add(label);
    const run = function (r) {
      P.standInsUsed.add(label);
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

module.exports = { labels, install };
