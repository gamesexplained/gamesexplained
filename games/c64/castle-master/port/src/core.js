// Castle Master's port: P, the game's routines on the game's memory. Each group of routines is a
// file of its own that adds its functions to P (CMGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. M[1] holds the processor port's data register ($01, CPU_MEMORY_CONFIG), which the
//   game sets to $35 for play (I/O in, no ROMs) and to $37 or $34 around the KERNAL's routines.
//   P.io is the chips (kit/c64/lockstep.js lists its functions): the port writes the video chip,
//   the SID, colour RAM and the CIAs through it, never through M.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z, n or v
//   where a caller reads them). That is the kit's standIn's form, so the game's own code can
//   stand in for any routine not yet written (in the tests only), and a routine of one group
//   calls another's as P.x. A local label a caller enters on its own (a JSR or JMP to it) is a
//   routine too, under its listing name.
// - A routine that waits (for the interrupt's countdown, for a key, for the timer's flag), or
//   calls one that does, is a generator: it yields where time passes, as kit/c64/lockstep.js
//   describes (a bare yield for each turn of a loop that polls memory the interrupt changes,
//   { cp: a } at a checkpoint), and is called with yield*. GEN lists them, and P.CHECKPOINTS the
//   places a routine yields { cp }, which each group adds to.
// - A byte the interrupt writes and the main program reads (the countdown $1063, the timer's
//   flag $1C73, the clock $1C64 ...) is read through P.irqByte(a): on the page that is M[a]; in
//   the lockstep it is what the game's code read there, since where an interrupt falls inside a
//   stretch is the game's own race.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
const GEN = new Set(`
  main_loop session_end
  UPDATE_FRAME_INPUT_EVENTS WAIT_FOR_SESSION_MESSAGE DISPATCH_FRAME_CONDITIONS RENDER_SCENE_IF_DIRTY PRESENT_FRAME
  REFRESH_ACTION_STATUS RUN_VIEWPORT_TRANSITION DISPATCH_PLAYER_MOVEMENT DISPATCH_AIM_FIRE_ACTIVATE EXECUTE_FCL_STREAM
  RUN_INFORMATION_MENU PROMPT_SAVE_DEVICE_AND_NAME LOAD_SAVE_DISPATCH
  ENGINE_INITIALIZE RESET_VECTOR_TARGET BUILD_MAIN_MENU RUN_TITLE_AND_CHARACTER_MENUS MAIN_LOOP start
`.trim().split(/\s+/));
function makePort(M, io, opts = {}) {
  const P = { M, GEN, CHECKPOINTS: [] };
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a new
  // set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  // The work inside routines whose length varies, counted for the page's pacing (the cost of a
  // routine is its calls' and these): each row the painter looks at and each byte it fills, each
  // step along an edge or a line, each line the viewport's opening and closing draw or clear. The
  // page reads and clears them (page/runtime.js), as the fit's rows do (scripts/time-stretches.js,
  // scripts/time-routines.js).
  P.N = { row: 0, fill: 0, step: 0, xstep: 0, line: 0, vline: 0, vclear: 0 };
  // and the interrupt's own: the view's colours filled in a sensor's flash
  P.NI = { fill: 0 };
  // A read and a write through the processor's map as $01 has it: the I/O at $D000-$DFFF when its
  // bits say so. The port has no ROMs: reading one is an error, as it would be a byte the port
  // cannot know.
  const ioIn = () => { const c = M[1] & 7; return (c & 3) !== 0 && (c & 4) !== 0; };
  P.rd = a => {
    const c = M[1] & 7;
    if (a >= 0xD000 && a < 0xE000 && (c & 3)) {
      if (c & 4) return IO.read(a);
      throw new Error('the port read the character ROM at $' + a.toString(16));
    }
    if ((a >= 0xE000 && (c & 2)) || (a >= 0xA000 && a < 0xC000 && (c & 3) === 3)) throw new Error('the port read a ROM at $' + a.toString(16));
    return M[a];
  };
  P.wr = (a, v) => { if (a >= 0xD000 && a < 0xE000 && ioIn()) IO.write(a, v); else M[a] = v & 255; };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
root.CMPort = { makePort, GEN };
})(typeof window !== 'undefined' ? window : globalThis);
