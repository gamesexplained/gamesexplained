// Green Beret's port: P, the game's routines on the game's memory. Each group of routines is a file
// of its own that adds its functions to P (GBGroups); this makes P and installs them. The names of
// the game's variables and tables are the listing's (GBNames, port/src/names.js).
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. The game runs with the processor port at $35 (RAM but for the chips at $D000-$DFFF);
//   it switches the chips out ($34, $30) to reach the RAM under them. P.rd and P.wr follow the
//   port as M[1] holds it; a routine that only ever touches RAM, or only ever the chips, uses M or
//   P.io (kit/c64/lockstep.js lists its functions) directly.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z, n or v
//   where a caller reads them). That is the kit's standIn's form, so the game's own code can stand
//   in for any routine not yet written (in the tests only), and a routine of one group calls
//   another's as P.x. A local label a caller enters on its own (a JSR or JMP to it) is a routine
//   too, under its listing name.
// - A routine that waits (for the interrupt's frame flag, for a tune to end, for fire), or calls one
//   that does, is a generator: it yields where time passes, as kit/c64/lockstep.js describes (a
//   bare yield for each turn of a loop that polls what the interrupt changes, { cp: a } at a
//   checkpoint), and is called with yield*. GEN lists them, and P.CHECKPOINTS the places the main
//   program yields, which each group adds to.
// - The game leaves a routine for another by a JMP far from where it was called: a death
//   (player_killed and mine_check drop their caller's return and go to lose_life), the end of a
//   stage, game over (new_game). The port throws P.jump(name) there, which unwinds to P.main, and
//   P.main goes on with the routine named, a generator that returns the name of the one it goes to
//   next. The game's stack is left as such a JMP leaves it: a death in an end-of-stage fight drops
//   one return address of the two its call made, and winning the Bridge jumps out of a call, and
//   the two bytes each leaves stay on the stack for good (P.leak counts them, from the main loop's
//   stack pointer, $FF at the start).
// - The interrupt does the hero's frame (irq_player), the frame counters and the raster bands. Its
//   handler runs whole, as the game's never lets another in (the multiplexer's CLI comes with the
//   next band's line still to come). Its routines are plain functions.
// - A byte the interrupt writes and the main program reads in the middle of a stretch (IRQ_BYTES)
//   is read through P.irqByte(a) wherever the main program reads it: on the page that is M[a]; in
//   the lockstep it is what the game's code read there, since where an interrupt falls is the
//   game's own race.
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
const GEN = new Set(`
  main startup cold_start new_game main_loop frame_wait wait_tune title_wait mine_check lose_life
  stage_complete stage_start stage_draw stage_end_dispatch prison_fight harbour_fight bridge_fight missile_fight
`.trim().split(/\s+/));
// The bytes the interrupt writes that the main program reads after it (kit/c64/lockstep.js,
// irqBytes), which P.irqByte reads: the frame flag and the frame counters, the time the hero has
// stood still and the difficulty; the hero, whom irq_player moves (his place, his pose, the stick,
// the scroll it counts, the ladder he is on, the limit of the scroll and the start of the stage's
// end); the knife's hits on the enemies and the dogs; and the sound driver's state, which the
// interrupt's three players share with the main program's (frame_wait) and with the effects
// started on either side.
const IRQ_BYTES = [0x5F, 0x60, 0x0180, 0x0181, 0x0234, 0x0239, 0x0249, 0x024D, 0x0308, 0x030F, 0x0316,
  0x0317, 0x031C, 0x0320, 0x0334, 0x0336, 0x0369, 0x03B2, 0x2A06, 0xE01F];
const span = (a, b) => { for (; a <= b; a++) IRQ_BYTES.push(a); };
span(0xE6, 0xFD); span(0x02B8, 0x02BB); span(0x02C9, 0x02CB); span(0x02DF, 0x02E4); span(0x03A9, 0x03AE);
span(0xEC00, 0xED3F);
const IRQ_SET = new Set(IRQ_BYTES);
const IRQ_MAP = new Uint8Array(65536);
for (const a of IRQ_BYTES) IRQ_MAP[a] = 1;
const JUMP = function Jump(go) { this.go = go; };
function makePort(M, io, opts = {}) {
  const P = { M, GEN, CHECKPOINTS: [], inIrq: 0, leak: 0 };
  // The main program's work whose length varies, counted for the page's pacing (port/scripts/
  // time-routines.js); the interrupt's own go in P.NI.
  P.N = {};
  P.NI = {};
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a new
  // set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte && !P.inIrq && IRQ_SET.has(a) ? IO.irqByte(a) : M[a]);
  Object.defineProperty(P, 'IRQ_SET', { value: IRQ_SET });
  // A read of a variable: through P.irqByte when it is one of IRQ_BYTES, from M otherwise. The
  // port reads each of those bytes as often as the game's code does, and in the same order, since
  // the lockstep hands out the game's reads one at a time.
  P.B = a => (IRQ_MAP[a] && IO.irqByte && !P.inIrq ? IO.irqByte(a) : M[a]);
  // The processor's interrupt flag, which the page's clock needs (an SEI holds the interrupts off
  // until the CLI) and the lockstep does not: the game's machine keeps its own
  P.sei = () => { if (IO.sei) IO.sei(); };
  P.cli = () => { if (IO.cli) IO.cli(); };
  P.iflag = () => (IO.iflag ? IO.iflag() : 0);
  // A turn of a routine's work counted for the page's pacing, in the main program's P.N or the
  // interrupt's P.NI: the work a routine does past its first test, where the game's cost of one
  // call depends on whether it gets there
  P.count = (k, n = 1) => { const c = P.inIrq ? P.NI : P.N; c[k] = (c[k] || 0) + n; };
  // A checkpoint of the main program
  Object.defineProperty(P, 'cp', { value: function* (a) { yield { cp: a }; } });
  // A JMP to another part of the game, out of every routine between (the header)
  P.jump = go => new JUMP(go);
  P.isJump = e => e instanceof JUMP;
  // The chips at $D000-$DFFF when the processor port shows them ($35), RAM under them otherwise.
  const chips = () => (M[1] & 3) !== 0 && (M[1] & 4) !== 0;
  P.rd = a => (a >= 0xD000 && a < 0xE000 && chips() ? IO.read(a) : M[a]);
  P.wr = (a, v) => { if (a >= 0xD000 && a < 0xE000 && chips()) IO.write(a, v & 255); else M[a] = v & 255; };
  // A pointer in zero page plus Y, as (zp),Y reads it.
  P.ind = (zp, y = 0) => ((M[zp] | M[(zp + 1) & 255] << 8) + y) & 0xFFFF;
  // ADC and SBC in decimal mode, as the 6502 does them for valid decimal digits: { v, c }
  P.adcD = (a, b, c) => {
    let lo = (a & 15) + (b & 15) + c, hi = (a >> 4) + (b >> 4);
    if (lo > 9) { lo += 6; hi++; }
    if (hi > 9) hi += 6;
    return { v: ((hi << 4) | (lo & 15)) & 255, c: hi > 15 ? 1 : 0 };
  };
  P.sbcD = (a, b, c) => {
    let lo = (a & 15) - (b & 15) - (1 - c), hi = (a >> 4) - (b >> 4);
    if (lo < 0) { lo -= 6; hi--; }
    const cOut = hi < 0 ? 0 : 1;
    if (hi < 0) hi -= 6;
    return { v: ((hi << 4) | (lo & 15)) & 255, c: cOut };
  };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
// What the main program's waits poll besides those: the joystick port and the keyboard.
const POLLS = IRQ_BYTES.concat([0xDC00, 0xDC01]);
root.GBPort = { makePort, GEN, IRQ_BYTES, POLLS };
})(typeof window !== 'undefined' ? window : globalThis);
