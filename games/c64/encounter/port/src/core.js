// Encounter's port: P, the game's routines on the game's memory. Each group of routines is a file of
// its own that adds its functions to P (EncGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses. The game runs with the
//   processor port at $26 or $36 (RAM at $A000-$BFFF, the chips at $D000-$DFFF, the KERNAL ROM at
//   $E000), so the port writes the video chip, the SID, colour RAM and the CIAs through P.io
//   (kit/c64/lockstep.js lists its functions), never through M, and reads them through it too.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z or n where
//   a caller reads them). That is the kit's standIn's form, so the game's own code can stand in for
//   any routine not yet written (in the tests only). The carry a routine is entered with matters
//   where it reaches memory (mul8x8's $21, the ADCs after a shift), so callers pass it.
// - A routine that waits (for the raster, for a key, for a count the interrupt runs down) is a
//   generator: it yields where time passes, as kit/c64/lockstep.js describes (a bare yield for each
//   turn of a loop that polls the raster, { cp: a } at a checkpoint, { wait: line } for the frame's
//   raster wait, { cycles: n, at: a } for a busy loop that ends at a), and is called with yield*.
//   P.CHECKPOINTS lists the places the main program yields, and P.WAITS the raster wait's exit.
// - The game is one long program of jumps: P.main runs from its first instruction ($9C3E, where a
//   reset enters it), and each of its parts returns the address it jumps to next.
// - The seven raster interrupts do the frame (src/g-irq.js): plain functions, each run whole when
//   it comes. None of them clears I, so none comes inside another.
// - A byte the interrupt writes and the main program reads in the middle of a stretch (IRQ_BYTES:
//   the frame countdowns $1D and $5A, the slow counter $58, the view flag $AA) is read through
//   P.irqByte(a) wherever the main program reads it: on the page that is M[a]; in the lockstep it is
//   what the game's code read there. One the main program writes that an interrupt also writes
//   (STORE_BYTES) is written through P.store(a, v), since the value may be the one the interrupt
//   left there.
(function (root) {
'use strict';
const G = root.EncGroups = root.EncGroups || {};
const IRQ_BYTES = [0x1D, 0x58, 0x5A, 0xAA];
const IRQ_SET = new Set(IRQ_BYTES);
// what the interrupt writes that the main program writes too: the countdowns and counters, and the
// four band colours apply_scene sets for a new scene
const STORE_BYTES = new Set([0x1B, 0x1D, 0x58, 0x5A, 0xBB, 0xBC, 0xBD, 0xBE]);

function makePort(M, io, opts = {}) {
  const P = { M, CHECKPOINTS: [], WAITS: [] };
  // The work counted for the page's pacing (port/scripts/time-routines.js): turns of the loops whose
  // length varies, by name
  P.N = {};
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte && IRQ_SET.has(a) ? IO.irqByte(a) : M[a]);
  P.store = (a, v) => { v &= 255; if (IO.store && STORE_BYTES.has(a)) IO.store(a, v); else M[a] = v; };
  // The processor's interrupt flag, which the page's clock needs and the lockstep does not
  P.sei = () => { if (IO.sei) IO.sei(); };
  P.cli = () => { if (IO.cli) IO.cli(); };
  P.count = k => { P.N[k] = (P.N[k] || 0) + 1; };
  // The chips at $D000-$DFFF, as the processor port shows them, and RAM everywhere else
  P.rd = a => (a >= 0xD000 && a < 0xE000 ? IO.read(a) : M[a]);
  P.wr = (a, v) => { if (a >= 0xD000 && a < 0xE000) IO.write(a, v & 255); else M[a] = v & 255; };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}

// The KERNAL's SCNKEY ($FF9F) as far as the game reads it: LSTX ($C5) is the last key found
// scanning the matrix from code 0 up, the modifiers (the shifts, C= and CTRL) aside, or $40 for
// none; SFDX ($CB) the same. The game calls it from the title and its key waits, never in play, and
// reads nothing else it sets. The simulator holds no ROM, so the game run on the kit's C64 calls
// this as a hook too (port/test/lib.js), on its own chips: k = { M, ciaRead(r), ciaWrite(r, v) }.
const MOD = { 0x0F: 1, 0x34: 1, 0x3D: 2, 0x3A: 4 };
function scnkey(k) {
  let key = 0x40;
  k.ciaWrite(0, 0);
  if (k.ciaRead(1) !== 0xFF) {
    for (let row = 0; row < 8; row++) {
      k.ciaWrite(0, ~(1 << row) & 0xFF);
      const v = k.ciaRead(1);
      for (let col = 0; col < 8; col++) {
        if (v & (1 << col)) continue;
        const code = row * 8 + col;
        if (!MOD[code]) key = code;
      }
    }
  }
  k.M[0xCB] = key; k.M[0xC5] = key;
  k.ciaWrite(0, 0x7F);
}

root.EncPort = { makePort, IRQ_BYTES, STORE_BYTES: [...STORE_BYTES], scnkey };
})(typeof window !== 'undefined' ? window : globalThis);
