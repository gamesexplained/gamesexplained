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

// Fill P with stand-ins for every label the port has not written. ported: the names it has.
function install(P, names, irqBytes = []) {
  const ported = new Set(Object.keys(P).filter(k => typeof P[k] === 'function'));
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
  for (const [label, a] of names) {
    if (!ported.has(label) || P.GEN.has(label)) continue;
    const f = P[label];
    hooks[a] = c => {
      P.M[1] = c.pdata;
      const r = f.call(P, regsOf(c)) || {};
      c.setRegs(Object.assign({}, r, { pc: undefined }));
      c.portWrite(1, P.M[1]);
      c.rts();
      return false;
    };
  }
  let cpu = null;
  P.standIns = new Set();
  for (const [label, a] of names) {
    if (ported.has(label)) continue;
    P.standIns.add(label);
    const run = function (r) {
      if (!cpu) cpu = standInCpu(P, irqBytes);
      const regs = { d: 0 };
      r = r || {};
      for (const k of ['a', 'x', 'y', 'n', 'v', 'z', 'c']) if (r[k] !== undefined) regs[k] = r[k];
      cpu.setRegs(regs);
      cpu.sp = 0xFF;
      cpu.portWrite(0, 0x2F); cpu.portWrite(1, P.M[1]);
      cpu.call(a, {}, { hooks, maxSteps: 5e6 });
      P.M[1] = cpu.pdata;
      return regsOf(cpu);
    };
    P[label] = P.GEN.has(label) ? function* (r) { return run(r); } : run;
  }
  return P;
}

module.exports = { labels, install };
