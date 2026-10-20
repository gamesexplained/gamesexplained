// Prospector Pete's port: P, the game's routines on the game's memory. Each group of routines is a
// file of its own that adds its functions to P (PeteGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's memory, the C16's 16 KB at $0000-$3FFF of a Uint8Array(65536), read and
//   written at the game's addresses, self-modified operands included.
// - P.io is TED and the keyboard: read(a) and write(a, v) for $FD30 and $FF00-$FF3F, irqByte(a),
//   sei() and cli() (kit/c16/lockstep.js lists them). A read-modify-write of a TED register (the
//   sound's INC and DEC $FF11) reads it once and writes it twice, the old value and then the new,
//   as the 7501 does: P.rmw.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y, c },
//   those it reads), and it returns the registers its callers read ({ a, x, y, c }). The carry is
//   kept wherever the game's code carries it into an ADC or SBC from an instruction before, across
//   calls too (random_below adds the carry it is called with).
// - A routine that waits, or calls one that does, is a generator, called with yield*: it yields
//   P.POLL at each turn of a loop that polls a byte an interrupt changes, { cycles: n } for a delay
//   loop's time, and { cp: a } at each call main_loop makes and each call in irq_play (where a
//   nested interrupt may come in), as kit/c16/lockstep.js describes. P.GEN lists them.
// - A byte an interrupt writes and the main program reads in the middle of its work is read
//   there through P.irqByte(a): on the page that is M[a]; in the lockstep it is what the game's
//   code read there (the bytes are P.IRQ_BYTES).
// - N counts the work inside routines whose length varies, for the page's pacing (runtime.js).
(function (root) {
'use strict';
const G = root.PeteGroups = root.PeteGroups || {};
const POLL = Object.freeze({ poll: true });

// The routines that are generators: those whose code can reach a wait.
const GEN = new Set(['main_loop', 'program', 'title', 'high_scores', 'start_level', 'pete_touches', 'check_death',
  'die_where_he_was', 'death', 'level_done', 'irq_play', 'move_creatures']);
// Bytes the interrupt writes that the main program reads in the middle of its work.
const IRQ_BYTES = [0x0A, 0x0B, 0x0C, 0x64, 0x7B, 0xBA, 0xBD, 0xC5];
// Bytes the game reads that listing.json does not hold: the table beside each earth character at
// $2970-$2972 (2, 1, 4; its last byte, 3, is earth_diagonal_base's first), untyped in symbols.json
// and so a gap in the listing, as the listing's comment at $296F gives it. The memory the port
// starts from is the listing's bytes and these.
const MISSING = { 0x2970: [0x02, 0x01, 0x04] };

// The 6502's ADC and SBC in decimal mode, as the NMOS part gives A and the carry.
function adcD(a, b, c) {
  let al = (a & 0x0F) + (b & 0x0F) + c;
  if (al >= 0x0A) al = ((al + 0x06) & 0x0F) + 0x10;
  let t = (a & 0xF0) + (b & 0xF0) + al;
  if (t >= 0xA0) t += 0x60;
  return { a: t & 0xFF, c: t >= 0x100 ? 1 : 0 };
}
function sbcD(a, b, c) {
  const t = a - b - (1 - c);
  let al = (a & 0x0F) - (b & 0x0F) + c - 1;
  if (al < 0) al = ((al - 0x06) & 0x0F) - 0x10;
  let r = (a & 0xF0) - (b & 0xF0) + al;
  if (r < 0) r -= 0x60;
  return { a: r & 0xFF, c: t >= 0 ? 1 : 0 };
}

function makePort(M, io, opts = {}) {
  const P = { M, POLL, GEN, IRQ_BYTES, adcD, sbcD };
  // P.io is one object for good, so that a routine may keep it: giving P a new set of chips (the
  // lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  P.rmw = (a, f) => { const v = IO.read(a); IO.write(a, v); const w = f(v) & 0xFF; IO.write(a, w); return w; };
  P.N = { view: 0, water: 0, waterMove: 0, flow: 0, add: 0, drop: 0, creature: 0, wander: 0, stick: 0, stickMove: 0 };
  for (const name of Object.keys(G)) G[name](P);
  return P;
}
root.PetePort = { makePort, POLL, GEN, IRQ_BYTES, MISSING, adcD, sbcD };
})(typeof window !== 'undefined' ? window : globalThis);
