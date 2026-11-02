// Driller's port: P, the game's routines on the game's memory. Each group of routines is a file of
// its own that adds its functions to P (DRGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the 64 KB the Z80 sees, read and written at the game's addresses, self-modified
//   operands and the multiply routines the game writes for itself included.
// - P.io is the machine around the processor: in(port) (the keyboard, the Kempston joystick, the
//   tape's EAR bit) and out(port, v) (the border, the beeper's EAR and MIC bits), and
//   irqByte(a).
// - A routine is P.<its listing label>(r): r holds the registers it is entered with, and it
//   returns the registers its callers read. The registers are a, f, b, c, d, e, h, l, ix, iy and
//   af_, bc_, de_, hl_; a pair may also be given and read as bc, de or hl, and a flag as zf, cf,
//   sf or pf, a boolean. That is the tests' stand-in's form (port/test/standin.js), so the game's
//   own code can stand in for any routine not yet written (in the tests only), and a routine of
//   one group calls another's as P.x. A place entered from elsewhere that is not a label (a
//   table's entry into the middle of a routine) is a function of its own, named by its routine and
//   its address.
// - A routine that waits (a loop polling the frame counter the interrupt counts down, or the
//   keys), or calls one that does, is a generator: it yields where time passes, as
//   kit/spectrum/lockstep.js describes (a bare yield for each turn of a polling loop, { cp: a } at
//   a checkpoint of the main loop), and is called with yield*. P.GEN lists them. The game never
//   halts.
// - P.jump(a, r) runs the routine at a, for the game's jumps through a table: P.CODE names each
//   routine's address.
// - The main program is P.program (g-main.js): a new game goes round its loop as the game's does.
//   Three wrong answers to the security question wipe memory and jump to $0000, where the machine
//   starts again: the port throws P.RESET there, for the page to start afresh.
// - A byte the interrupt writes and the main program reads is read through P.irqByte(a): on the
//   page that is M[a]; in the lockstep it is what the game's code read there.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};
const RESET = { reset: true, toString: () => 'the machine reset' };

function makePort(M, io, opts = {}) {
  const P = { M, GEN: new Set(), CODE: {}, RESET };
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  // counts of the work inside routines whose length varies, for the page's pacing
  // (scripts/fit-cost.js, page/runtime.js)
  P.N = {};
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  // A tight loop on a byte the interrupt writes, until (byte AND mask) is 0: each turn yields the
  // T-states the game's turn takes (LD A,(nn) / OR A / JR NZ, 29; BIT 0,(HL) / JR NZ, 24), so that
  // the port reads the byte as often as the game does in the same time.
  P.until0 = function* (a, mask, turn) { while (P.irqByte(a) & mask) yield { tstates: turn }; };
  P.w = a => M[a] | M[(a + 1) & 0xFFFF] << 8;
  P.setw = (a, v) => { M[a] = v & 255; M[(a + 1) & 0xFFFF] = (v >> 8) & 255; };
  // name a routine: its address, its function; a generator is listed in GEN
  P.def = (a, name, f) => {
    P[name] = f;
    P.CODE[a] = name;
    if (f.constructor.name === 'GeneratorFunction') P.GEN.add(name);
    return f;
  };
  P.jump = (a, r) => {
    const name = P.CODE[a];
    if (name && P.GEN.has(name)) throw new Error('P.jump: $' + a.toString(16) + ' waits; jumpGen it');
    if (name && P[name]) return P[name](r || {});
    if (P.at) return P.at(a, r || {});
    throw new Error('the port has no routine at $' + a.toString(16));
  };
  P.jumpGen = function* (a, r) {
    const name = P.CODE[a];
    if (name && P.GEN.has(name)) return yield* P[name](r || {});
    return P.jump(a, r);
  };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
root.DRPort = { makePort, RESET };
})(typeof window !== 'undefined' ? window : globalThis);
