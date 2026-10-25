// The Sacred Armour of Antiriad's port: P, the game's routines on the game's memory. Each group of
// routines is a file of its own that adds its functions to P (AntGroups); this makes P and installs
// them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. The game runs with the processor port at $05 (all RAM, the chips at $D000-$DFFF), so
//   the port writes the video chip, the SID, colour RAM and the CIAs through P.io (kit/c64/
//   lockstep.js lists its functions), never through M, and reads them through it too.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z, n or v
//   where a caller reads them). That is the kit's standIn's form, so the game's own code can stand
//   in for any routine not yet written (in the tests only), and a routine of one group calls
//   another's as P.x. A local label a caller enters on its own (a JSR or JMP to it) is a routine
//   too, under its listing name.
// - A routine that waits (for fire, for a count the interrupt runs down, for a tune to end), or
//   calls one that does, is a generator: it yields where time passes, as kit/c64/lockstep.js
//   describes (a bare yield for each turn of a loop that polls what the interrupt changes,
//   { cp: a } at a checkpoint), and is called with yield*. GEN lists them, and P.CHECKPOINTS the
//   places the main program yields, which each group adds to.
// - The interrupt does the game's frame (raster_bands' tasks), and its handler clears I first, so
//   the next interrupts come inside it (kit/c64/machine.js, nest). Its routines are plain
//   functions, each run whole when the interrupt comes.
// - A game ends with restart_game, which resets the stack and jumps to cold_start, from the
//   interrupt (the Q key, the last life) or from the main program (the victory). The port throws
//   P.RESTART there: thrown in the main program, it unwinds to P.main, which starts again; thrown
//   in the interrupt, irq_handler catches it and sets P.taken, and the main program throws it at
//   its next checkpoint (P.cp), where the game has gone to cold_start.
// - A byte the interrupt writes and the main program reads in the middle of a stretch (IRQ_BYTES)
//   is read through P.irqByte(a) wherever the main program reads it, and one that a handler reads
//   after another came inside it and changed it (HANDLER_BYTES, the sound driver's) wherever a
//   handler reads it: on the page that is M[a]; in the lockstep it is what the game's code read
//   there, since where an interrupt falls is the game's own race. P.inIrq says which it is.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
const GEN = new Set(`
  main cold_start title_sequence title_attract title_credits victory_sequence main_loop
`.trim().split(/\s+/));
// The bytes an interrupt writes that the main program, or a handler another came inside, reads
// after it (kit/c64/lockstep.js, irqBytes), which P.irqByte reads: the waits' counters and the
// tune's flags the title and the ending poll; the collisions latched for scenery_hits; the
// energies, the tiles' and the slots' timers; the zero page hazard_left and hazard_right share
// with the interrupt's own calls of them; the sprite pictures saved under the stone; and all of
// the sound driver's, which the music's interrupt and the effects' share when one comes inside the
// other, and irq_handler's copy of CIA 1's flags ($A1).
const IRQ_BYTES = [0x22, 0x23, 0x40, 0x45, 0x4F, 0x51, 0x54, 0x67, 0x68, 0x6B, 0x6F, 0x7C, 0x85, 0x86,
  0x87, 0x8F, 0x91, 0x0201, 0x0210, 0x0215, 0x0260, 0x0261, 0x0262, 0x0268,
  0x0269, 0x0278, 0x0279, 0x02A7, 0x02B8, 0x02B9, 0x02DB];
const span = (a, b) => { for (; a <= b; a++) IRQ_BYTES.push(a); };
span(0x2E, 0x37); span(0x94, 0xA1); span(0x0248, 0x024F); span(0x022F, 0x0247); span(0x0310, 0x0360); span(0x0361, 0x03E0);
// Those a handler reads through P.irqByte: the sound driver's state and irq_handler's $A1.
const HANDLER_BYTES = [];
for (let a = 0x2E; a <= 0x37; a++) HANDLER_BYTES.push(a);
for (let a = 0x94; a <= 0xA1; a++) HANDLER_BYTES.push(a);
for (let a = 0x022F; a <= 0x0247; a++) HANDLER_BYTES.push(a);
for (let a = 0x0310; a <= 0x0360; a++) HANDLER_BYTES.push(a);
const HANDLER_SET = new Set(HANDLER_BYTES);
const IRQ_SET = new Set(IRQ_BYTES);
const RESTART = { restart: true };
function makePort(M, io, opts = {}) {
  const P = { M, GEN, CHECKPOINTS: [], taken: false, inIrq: 0 };
  // The main program's work whose length varies, counted for the page's pacing (port/scripts/
  // time-routines.js); the interrupt's own go in P.NI.
  P.N = {};
  P.NI = {};
  Object.defineProperty(P, 'RESTART', { value: RESTART });
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a new
  // set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte && (P.inIrq ? HANDLER_SET.has(a) : IRQ_SET.has(a)) ? IO.irqByte(a) : M[a]);
  Object.defineProperty(P, 'IRQ_SET', { value: IRQ_SET });
  // The processor's interrupt flag, which the page's clock needs (an SEI holds the interrupts off
  // until the CLI) and the lockstep does not: the game's machine keeps its own
  P.sei = () => { if (IO.sei) IO.sei(); };
  P.cli = () => { if (IO.cli) IO.cli(); };
  // The work counted so far (P.N) paid to the page's clock in the middle of a long routine, so that
  // what it writes after comes when the C64 writes it; the lockstep has no clock to pay
  P.paid = () => { if (IO.pay) IO.pay(); };
  // A turn of a routine's work counted for the page's pacing, in the main program's P.N or the
  // interrupt's P.NI: the work a routine does past its first test, where the game's cost of one
  // call depends on whether it gets there
  P.count = k => { const n = P.inIrq ? P.NI : P.N; n[k] = (n[k] || 0) + 1; };
  // A checkpoint of the main program: the yield, then the restart an interrupt asked for
  Object.defineProperty(P, 'cp', { value: function* (a) { yield { cp: a }; if (P.taken) { P.taken = false; throw RESTART; } } });
  // The chips at $D000-$DFFF, as the processor port's $05 shows them, and RAM everywhere else.
  P.rd = a => (a >= 0xD000 && a < 0xE000 ? IO.read(a) : M[a]);
  P.wr = (a, v) => { if (a >= 0xD000 && a < 0xE000) IO.write(a, v & 255); else M[a] = v & 255; };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
// What the main program's waits poll besides those: the joystick port, for fire.
const POLLS = IRQ_BYTES.concat([0xDC00, 0xDC01]);
root.AntPort = { makePort, GEN, IRQ_BYTES, POLLS, RESTART };
})(typeof window !== 'undefined' ? window : globalThis);
