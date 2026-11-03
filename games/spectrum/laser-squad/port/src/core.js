// Laser Squad's port: P, the game's routines on the game's memory. Each group of routines is a
// file of its own that adds its functions to P (LSGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the 64 KB the Z80 sees, read and written at the game's addresses: the engine's own
//   variables (most at $5B00-$5E27, some inside the engine), the scenario loaded at $B621-$FFFF,
//   and the screen.
// - P.io is the machine around the processor: in(port) (the keyboard and the joysticks),
//   out(port, v) (the border and the beeper), r() (the value an LD A,R reads: the game reads the
//   refresh register for its random numbers and its noise), and tape, the cassette, for the
//   scenarios and the saved games (load(flag, length), save(flag, bytes)).
// - A routine is P.<its listing label>(r): r holds the registers it is entered with, and it
//   returns the registers its callers read. The registers are a, f, b, c, d, e, h, l, ix, iy;
//   a pair may also be given and read as bc, de or hl, and a flag as zf or cf, a boolean. That is
//   the tests' stand-in's form (port/test/standin.js), so the game's own code can stand in for any
//   routine not yet written (in the tests only), and a routine of one group calls another's as
//   P.x.
// - A routine that waits for a key, or calls one that does, is a generator: it yields at each
//   read of the controls, as kit/spectrum/lockstep.js describes ({ cp: a } where the game calls
//   its routine at a, { tstates: n } for the delay loops between), and is called with yield*.
//   P.GEN lists them. The interrupts are off for the whole game: nothing runs but the main
//   program.
// - P.jump(a, r) runs the routine at a, for the game's jumps through a table: P.CODE names each
//   routine's address.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};

// The engine's variables, by the name the listing gives them.
const V = {
  VIEW_ROW: 0x5CFC, VIEW_COL: 0x5CFD,     // the map's square at the top left of the view
  PRINT_ROW: 0x5CFE, PRINT_COL: 0x5CFF,   // where the next character or tile is drawn
  ATTR: 0x5D00, ATTR2: 0x5D01,            // its colours
  MAP_PTR: 0x5D02,
  TILE_GFX: 0x5D0E,
  CURSOR_ROW: 0x5D11, CURSOR_COL: 0x5D12, // the cursor's square in the view
};

function makePort(M, io, opts = {}) {
  const P = { M, V, GEN: new Set(), CODE: {} };
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  // counts of the work inside routines whose length varies, for the page's pacing
  P.N = {};
  P.count = (k, n = 1) => { P.N[k] = (P.N[k] || 0) + n; };
  // the T-states the port has spent in the game's delay loops and its sound, for the page's clock:
  // P.T runs on for good, P.take() gives what was spent since it last took
  P.T = 0; P.T0 = 0;
  P.spend = n => { P.T += n; };
  P.take = () => { const n = P.T - P.T0; P.T0 = P.T; return n; };
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
root.LSPort = { makePort, V };
})(typeof window !== 'undefined' ? window : globalThis);
