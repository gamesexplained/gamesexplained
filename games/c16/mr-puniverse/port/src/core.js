// Mr Puniverse's port: P, the game's routines on the game's memory. Each group of routines is a
// file of its own that adds its functions to P (PuniGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's memory, the C16's 16 KB at $0000-$3FFF of a Uint8Array(65536), read and
//   written at the game's addresses: the screen at $0800-$0FFF, the objects' tables from $0FE8, the
//   characters the game rewrites to animate its scenery and to draw the player ($3800-$3FFF), and
//   the operands Plus/4 World's pokes change (cheats.md), which the port reads where the game's
//   code has them.
// - P.io is TED and the keyboard: read(a) and write(a, v) for $FD30 and $FF00-$FF3F, irqByte(a),
//   sei() and cli() (kit/c16/lockstep.js lists them). A read-modify-write of a register (the
//   death's INC $FF0F) reads it and writes the old value back before the new one, as the 6502 does.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y },
//   those it reads), and it returns the registers its callers read, and the carry ({ c }) where a
//   caller carries it into an SBC (move_down) or tests it (is_solid, energy_tick).
// - A routine that waits, or calls one that does, is a generator, called with yield*: it yields
//   P.POLL at each turn of a loop that polls the key code an interrupt changes, { cycles: n } for a
//   delay loop's time, and { cp: a } at the checkpoints test/lockstep.js lists, as
//   kit/c16/lockstep.js describes. P.GEN lists them.
// - The game leaves a routine for the death sequence or the next room by taking its return address
//   off the stack (PLA, PLA, JMP death) or by jumping on (JMP leave_room, which jumps to
//   room_start). The port's routines return where the game goes next instead: 'death' or
//   'room_start', which main_loop returns to program; a routine that returns nothing went back to
//   its caller.
// - The key code and the SHIFT flag the KERNAL's keyboard scan leaves in $C6 and $0543 are read by
//   the main program through B(a), P.irqByte: on the page that is M[a]; in the lockstep it is what
//   the game's code read there. Every read the game's main program makes of them goes through it,
//   in the game's order, so that each gets the value the game's read got (P.IRQ_BYTES).
// - N counts the work inside routines whose length varies, for the page's pacing (runtime.js):
//   scan, the cycles of the KERNAL's keyboard scan in irq, as C16.scnkey counts them; fig, the
//   pixels of the figure merge_player draws over the scenery; wall, the wall pairs draw_room draws;
//   top, the wall tops; edge, the cells draw_room_objects turns into exits; cell, the cells
//   fill_cells and draw_column fill; block, the blocks make_decor draws.
// - Each group keeps its helpers to itself (at, the address (pointer),y reaches), so that P holds
//   only the game's routines, which the lockstep and the page count as calls.
(function (root) {
'use strict';
const G = root.PuniGroups = root.PuniGroups || {};
const POLL = Object.freeze({ poll: true });

// The game's zero page, by the listing's names.
const Z = Object.freeze({
  controls: 0x03, colour_ptr_lo: 0x0A, block_ptr: 0x3F, player_x: 0x41, player_y: 0x42, rec_ptr: 0x43,
  key_code: 0xC6, tune_frame: 0xD0, tune_step: 0xD1, tune_volume: 0xD2, tune_voices: 0xD3,
});
// The variables above zero page, the objects' tables and the game's tables, by the listing's names.
const T = Object.freeze({
  under_player: 0x0333, room_colours: 0x0339, anim_phase: 0x033C, exit_up: 0x033D, exit_down: 0x033E,
  exit_left: 0x033F, exit_right: 0x0340, saved_ptr_lo: 0x0341, saved_ptr_hi: 0x0343, lives: 0x0345,
  room: 0x0347, active: 0x0349, player: 0x034B, bar_pos: 0x034C, keyboard: 0x034D, jumping: 0x034E,
  jump_count: 0x034F, energy_count: 0x0351, energy_rate: 0x0352, unused_0353: 0x0353, clock_count: 0x0354,
  vitamin_count: 0x0355, saved_x: 0x0357, saved_y: 0x0359, vitamin_lo: 0x035B, vitamin_id: 0x035D,
  vitamin_colour: 0x035E, energy_mode: 0x035F, vitamins_got: 0x0366, music_on: 0x0385, old_music_flag: 0x03BB,
  shot_char: 0x03FC, shift_flag: 0x0543,
  screen_colours: 0x0800, screen_chars: 0x0C00, egy_bar: 0x0FC4,
  switch_state: 0x0FE8, obj_type: 0x0FF0, obj_lo: 0x1004, obj_colour: 0x1018, obj_param: 0x102C,
  obj_timer: 0x1040, obj_reload: 0x1054, shot_hi: 0x1068, shot_lo: 0x107C,
  room_ptr_lo: 0x1090, room_ptr_hi: 0x10AE, tune_voice1: 0x196E, note_freq_lo: 0x19EE, note_freq_hi: 0x1A0A,
  tune_voice2: 0x1A27, title_path: 0x340D, player_frames: 0x3A68, player_chars: 0x3BC0, glyph_buffer: 0x3FD0,
  vitamins_to_win: 0x281F,
});

// The bytes of RAM below the game that the KERNAL and the tape leave as the tape's BASIC line
// hands over at entry ($1AF4), which the game and the KERNAL's keyboard scan (irq) read before
// anything writes them: the key code and the table pointer, the keyboard's state and its vector at
// $0545, the function keys' lengths, and two flags of the screen editor's; and four bytes of the
// tape buffer ($0333-$03F2) as the load leaves them: $0339-$033B, which irq reads as the room's
// three colours until the first room is drawn, so they colour the title and the menu, and $034B,
// the player in play, whose TIME label the first interrupts flip before new_game clears it. The
// rest of the RAM below $1090 is 0 there as far as the game is concerned: it clears or writes all
// of it before reading it.
const KERNAL_RAM = Object.freeze([
  [0x00C6, [0x40]], [0x00EC, [0x00, 0x00, 0xFF, 0x00, 0x00]],
  [0x0339, [0x4C, 0x4A, 0xF0]], [0x034B, [0xA1]],
  [0x053F, [0x0A, 0x80, 0x04, 0x0A, 0x00, 0x00, 0x7A, 0xDB, 0x00]],
  [0x055F, [0x07, 0x06, 0x0A, 0x07, 0x06, 0x04, 0x05, 0x05]],
  [0x07F6, [0x40, 0x00]],
]);

// The routines that are generators: those whose code can reach a wait, a poll or a checkpoint.
const GEN = new Set(['program', 'new_game', 'start_turn', 'room_start', 'main_loop', 'death', 'delay',
  'title_dot_step', 'refill_energy', 'player_pass', 'pause_check', 'collect_vitamin']);
// Bytes an interrupt writes that the main program reads: the key code and the SHIFT flag.
const IRQ_BYTES = [0xC6, 0x0543];

function makePort(M, io, opts = {}) {
  const P = { M, Z, T, POLL, GEN, IRQ_BYTES };
  // P.io is one object for good, so that a routine may keep it: giving P a new set of chips (the
  // lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  P.N = { scan: 0, fig: 0, wall: 0, top: 0, edge: 0, cell: 0, block: 0 };
  for (const name of Object.keys(G)) G[name](P);
  return P;
}
root.PuniPort = { makePort, POLL, GEN, IRQ_BYTES, KERNAL_RAM, Z, T };
})(typeof window !== 'undefined' ? window : globalThis);
