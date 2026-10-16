// Space Rogue's port: P, the game's routines on the game's memory. Each group of routines is a file
// of its own that adds its functions to P (SRGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. M[1] holds the processor port's data register, which the game reads and writes as
//   $01 (zp_port); RAM under it is never used. P.io is the chips (kit/c64/lockstep.js lists its
//   functions), and the disk: P.io.load(name) gives a file's bytes with its two-byte address
//   first, or null; P.io.block(track, sector) a sector the game reads by block; P.io.save(name,
//   bytes) keeps a file.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z or n where
//   a caller reads them). That is the kit's standIn's form, so the game's own code can stand in
//   for any routine not yet written (in the tests only), and a routine of one group calls
//   another's as P.x.
// - A routine that waits (for a key, for the interrupt's frame count, in a delay loop), or calls
//   one that does, is a generator: it yields where time passes, as kit/c64/lockstep.js describes
//   (a bare yield for each turn of a loop that polls memory the interrupt changes, { cycles: n }
//   for a delay loop, { cp: a } at a checkpoint), and is called with yield*. GEN lists them, and
//   P.CHECKPOINTS the places a routine yields { cp }, which each group adds to.
// - A byte the interrupt writes and the main program reads (the frame count $16, the keyboard
//   buffer $03-$15) is read through P.irqByte(a): on the page that is M[a]; in the lockstep it is
//   what the game's code read there, since where an interrupt falls inside a stretch is the
//   game's own race.
// - P.at maps a load address to the name of the file last loaded there ($A500: SEG0 or SEG1;
//   $E400: a model or SEG1A), for the routines of an overlay.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
const GEN = new Set(`
  main_loop do_key wait_key wait_fire_up
  check_collisions on_contact collide gate_contact gate_jump dock dock_check build_draw_list draw_frame
  station_run
`.trim().split(/\s+/));
class Goto { constructor(to, r) { this.to = to; this.r = r || {}; } }
function makePort(M, io, opts = {}) {
  const P = { M, Goto, GEN, at: {}, CHECKPOINTS: [] };
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a new
  // set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  // A read and a write through the processor's map as $01 has it, for the few routines whose
  // accesses go either way (a load's bytes, a save's): the I/O at $D000-$DFFF when its bits say so.
  // The port has no ROMs: reading one is an error, as it would be a byte the port cannot know.
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
  P.wr = (a, v) => { if (a >= 0xD000 && a < 0xE000 && ioIn()) IO.write(a, v); else M[a] = v; };
  for (const name of Object.keys(G)) if (!opts.only || opts.only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
root.SRPort = { makePort, Goto, GEN };
})(typeof window !== 'undefined' ? window : globalThis);
