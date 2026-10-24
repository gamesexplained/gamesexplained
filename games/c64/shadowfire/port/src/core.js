// Shadowfire's port: P, the game's routines on the game's memory. Each group of routines is a file
// of its own that adds its functions to P (SFGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. M[1] holds the processor port's data register ($01), which the game sets to $14 (all
//   RAM) to copy the game's state under the chips at $D000-$D5FF, and to $35 (I/O in, no ROMs) for
//   everything else. P.io is the chips (kit/c64/lockstep.js lists its functions): the port writes
//   the video chip, the SID, colour RAM and the CIAs through it, never through M.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z, n or v
//   where a caller reads them). That is the kit's standIn's form, so the game's own code can
//   stand in for any routine not yet written (in the tests only), and a routine of one group calls
//   another's as P.x. A local label a caller enters on its own (a JSR or JMP to it) is a routine
//   too, under its listing name.
// - A routine that waits (for the raster, for a key, for the interrupt to move the cursor), or calls
//   one that does, is a generator: it yields where time passes, as kit/c64/lockstep.js describes (a
//   bare yield for each turn of a loop that polls what the interrupt changes, { cp: a } at a
//   checkpoint, { wait: line, at: exit } at a raster wait's exit, where the page's clock pays for
//   the work since from and then waits), and is called with yield*. So is a routine that draws for
//   longer than a frame (the iris, the panels, the view's map): it yields { cycles: 0 } every few
//   thousand cycles, where the page takes the controls' new state, which the interrupt reads each
//   frame. GEN lists them, and P.CHECKPOINTS and P.WAITS the places a routine yields, which each
//   group adds to.
// - The main program never returns: its screens hand over to one another with a JMP, and a JMP out
//   of a two-step choice leaves its return address on the 6502's stack, which the game never takes
//   back. The port throws P.jump(place) there instead, which unwinds every routine under way to the
//   main program's loop (P.main), and that runs the place.
// - A byte the interrupt writes and the main program reads in the middle of a stretch (the fire
//   flag $78, the mission $CA05 ...: IRQ_BYTES) is read through P.irqByte(a), wherever the main
//   program reads it: on the page that is M[a]; in the lockstep it is what the game's code read
//   there, since where an interrupt falls inside a stretch is the game's own race.
(function (root) {
'use strict';
const G = root.SFGroups = root.SFGroups || {};
const GEN = new Set(`
  main start restart control_menu shake_screen leave_to_start_menu icon_loop icon_poll icon_test
  team_screen j_6DE9 movement_screen move_by_exit move_exit_1 choose_character choose_syylk status_screen
  objects_screen j_6F62 object_slot_0 object_slot_6 pick_up drop ready activate page_here page_carried
  quit_choice battle_screen j_7134 j_713C scan_exit_1 location_scan scan_here person_slot_0 page_people
  attack retreat defend activate_beacon activate_ballistic start_menu j_74BE old_game new_game
  load_game save_game name_screen j_767F choose_tape choose_disk add_letter letter_a rub_out start_file
  music_up music_down no_action cursor_cell
  show_portrait roll_monitor frame_icon iris_circle iris_open iris_close clear_panels draw_screen
  build_directions draw_view_map find_view_locations draw_picture b_4324 print_text
`.trim().split(/\s+/));
// The bytes the interrupt writes that the main program reads in the middle of a stretch, which
// P.irqByte reads: the leave request ($6932), the mission ($CA05), the team changed ($68B2), a door
// opened ($CF82), fire ($78), the clock's seconds ($CA00), the music's step count ($161C, which
// cell_address reads for row 255), and the status and location of each of the six team members,
// whose records start at $CA0E.
const IRQ_BYTES = [0x6932, 0xCA05, 0x68B2, 0xCF82, 0x78, 0xCA00, 0x161C];
for (let e = 0; e < 6; e++) IRQ_BYTES.push(0xCA0E + 18 * e, 0xCA0E + 18 * e + 2);
const IRQ_SET = new Set(IRQ_BYTES);
// A JMP to a place the main program goes on from, thrown to P.main.
class Jump {
  constructor(to) { this.to = to; }
}
function makePort(M, io, opts = {}) {
  const P = { M, GEN, CHECKPOINTS: [], WAITS: [] };
  // not one of P's routines, which the lockstep's timing wraps to count their calls
  Object.defineProperty(P, 'Jump', { value: Jump });
  // A drawing routine, a generator that hands the page's clock back as it goes, run through where
  // its caller cannot yield (the interrupt): its result
  Object.defineProperty(P, 'drain', { value: it => { for (;;) { const r = it.next(); if (r.done) return r.value; } } });
  // The main program's work whose length varies, counted for the page's pacing (port/scripts/
  // fit-cost.js): a picture's bitmap bytes and colour cells, a text's glyphs and other codes, a
  // box's edge cells, the location search's steps, the icons the cursor's cell is tested against
  // that can be chosen and those in its row, the music driver's cycles on the 6502 core, the rows
  // clear_panels clears and the bits the iris's points are shifted by.
  // The interrupt's own go in P.NI (src/g-irq.js).
  P.N = { byte: 0, cell: 0, glyph: 0, code: 0, edge: 0, search: 0, music: 0, enabled: 0, inrow: 0, panel: 0, shift: 0 };
  P.NI = {};
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a new
  // set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte && IRQ_SET.has(a) ? IO.irqByte(a) : M[a]);
  // The processor's interrupt flag, which the page's clock needs (an SEI holds the raster's
  // interrupt off until the CLI) and the lockstep does not: the game's machine keeps its own
  P.sei = () => { if (IO.sei) IO.sei(); };
  P.cli = () => { if (IO.cli) IO.cli(); };
  P.jump = to => { throw new Jump(to); };
  // A read and a write through the processor's map as $01 has it: the I/O at $D000-$DFFF when its
  // bits say so, the RAM under it when they do not. The port has no ROMs: reading one is an error,
  // as it would be a byte the port cannot know.
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
root.SFPort = { makePort, GEN, Jump, IRQ_BYTES };
})(typeof window !== 'undefined' ? window : globalThis);
