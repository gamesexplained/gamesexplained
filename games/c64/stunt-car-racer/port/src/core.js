// Stunt Car Racer's port: P, the game's routines on the game's memory. Each group of routines is a
// file of its own that adds its functions to P (SCRGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. M[1] holds the processor port's data register ($01), which the game sets to $35 in
//   play (I/O in, no ROMs), to $34 (all RAM) while it reads or writes the tables under the I/O area,
//   and to $36 around the KERNAL's disk routines. P.io is the chips (kit/c64/lockstep.js lists its
//   functions): the port writes the video chip, the SID, colour RAM and the CIAs through it, never
//   through M. P.rd(a) and P.wr(a, v) read and write through the processor's map as $01 has it.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z, n or v
//   where a caller reads them). That is the kit's standIn's form, so the game's own code can
//   stand in for any routine not yet written (in the tests only), and a routine of one group
//   calls another's as P.x. A local label a caller enters on its own (a JSR or JMP to it) is a
//   routine too, under its listing name.
// - A routine that waits (for the raster, for the interrupt's flag, for a key), or calls one that
//   does, is a generator: it yields where time passes, as kit/c64/lockstep.js describes (a bare
//   yield for each turn of a loop that polls, { cycles } for a delay loop's time, { cp: a } at a
//   checkpoint), and is called with yield*. GEN lists them, and P.CHECKPOINTS the places a routine
//   yields { cp }, which each group adds to.
// - A byte the interrupt writes and the main program reads is read through P.irqByte(a): on the
//   page that is M[a]; in the lockstep it is what the game's code read there, since where an
//   interrupt falls inside a stretch is the game's own race.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
const GEN = new Set();
function makePort(M, io, opts = {}) {
  const P = { M, GEN, CHECKPOINTS: [] };
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a new
  // set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  P.store = (a, v) => { if (IO.store) IO.store(a, v & 255); else M[a] = v & 255; };
  // The work inside routines whose length varies, counted for the page's pacing; the page reads
  // and clears them, as the fit's rows do.
  P.N = {};
  // The plug-in points: the places in the race's routines where the Play tab's Fast CPU
  // (site/lib/fast-cpu.js, with the table in page/fast-table.js) passes in a value or skips a job,
  // each marked "plug-in point" where it is used. These are the game's own: with nothing plugged
  // in, each gives what the game's code gives, so the lockstep holds the port and its plug-in
  // points together. Fast CPU replaces them while a pass of the race runs:
  // - step(key, v): a move by v (a force into a speed, a speed into a place, a turn), signed; Fast
  //   CPU gives the loop's share of it;
  // - once(key): a job whose effect adds up (a count of passes, the clocks, a sound started, a
  //   roll of the dice); Fast CPU runs it once a step;
  // - log(key, v) and back(key, v): a value the game keeps from one pass to the next to take a
  //   change over a pass (a spring's depth), logged where the game keeps it, and given back where
  //   it reads it: Fast CPU gives the one logged a step ago;
  // - hold(key) and holding(key): a push the game adds to a force for one pass and then clears:
  //   Fast CPU adds it again on the rest of the step's loops (holding is true on those);
  // - glide(key, v): a value the game sets once a step from a table (the swerve's wave): Fast CPU
  //   moves it from one step's to the next's over the step's loops;
  // - leave(): the race starting again after a wreck, which Fast CPU runs in the machine's time.
  P.plug = {
    step: (key, v) => v, once: key => true, log: (key, v) => {}, back: (key, v) => v,
    hold: key => {}, holding: key => false, glide: (key, v) => v, leave: () => {},
  };
  // A read and a write through the processor's map as $01 has it: the I/O at $D000-$DFFF when its
  // bits say so. The port has no ROMs: reading one is an error, as it would be a byte the port
  // cannot know.
  const ioIn = () => { const c = M[1] & 7; return (c & 3) !== 0 && (c & 4) !== 0; };
  P.ioIn = ioIn;
  P.rd = a => {
    const c = M[1] & 7;
    if (a >= 0xD000 && a < 0xE000 && (c & 3)) {
      if (c & 4) return IO.read(a);
      throw new Error('the port read the character ROM at $' + a.toString(16));
    }
    if ((a >= 0xE000 && (c & 2)) || (a >= 0xA000 && a < 0xC000 && (c & 3) === 3)) throw new Error('the port read a ROM at $' + a.toString(16));
    return M[a];
  };
  P.wr = (a, v) => { if (a >= 0xD000 && a < 0xE000 && ioIn()) IO.write(a, v & 255); else M[a] = v & 255; };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
// The 6502's arithmetic, for the routines that keep the carry between instructions
const S = {
  // a signed byte
  sb: v => (v << 24) >> 24,
  // add with carry: { v, c } (v the byte, c the carry out)
  adc: (a, b, c) => { const t = a + b + c; return { v: t & 255, c: t > 255 ? 1 : 0 }; },
  // subtract with borrow (carry set means none): { v, c }
  sbc: (a, b, c) => { const t = a - b - (1 - c); return { v: t & 255, c: t >= 0 ? 1 : 0 }; },
  // add with carry in decimal mode, as the NMOS 6502 does it (the result and the carry): the race's
  // clocks count in binary-coded decimal. Subtracting gives the binary carry in either mode.
  adcD: (a, b, c) => {
    let al = (a & 0x0F) + (b & 0x0F) + c;
    if (al >= 0x0A) al = ((al + 0x06) & 0x0F) + 0x10;
    let t = (a & 0xF0) + (b & 0xF0) + al;
    if (t >= 0xA0) t += 0x60;
    return { v: t & 255, c: t >= 0x100 ? 1 : 0 };
  },
};
root.SCRPort = { makePort, GEN, S };
})(typeof window !== 'undefined' ? window : globalThis);
