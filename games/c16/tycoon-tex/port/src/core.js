// Tycoon Tex's port: P, the game's routines on the game's memory. Each group of routines is a
// file of its own that adds its functions to P (TexGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's memory, the C16's 16 KB at $0000-$3FFF of a Uint8Array(65536), read and
//   written at the game's addresses, its self-modified code included: the instruction at $1878
//   that read_controls rewrites, the table address in draw_tex's and erase_tex's LDY that
//   tex_death rewrites, and the operands Plus/4 World's pokes change (cheats.md), which the port
//   reads where the game's code has them.
// - P.io is TED and the keyboard: read(a) and write(a, v) for $FD30 and $FF00-$FF3F, irqByte(a),
//   sei() and cli() (kit/c16/lockstep.js lists them).
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y, c },
//   those it reads), and it returns the registers its callers read. The carry is kept wherever the
//   game's code carries it into an ADC or a ROL from an instruction before, across calls too:
//   random adds the carry it is called with, which differs by caller.
// - A routine that waits, or calls one that does, is a generator, called with yield*: it yields
//   P.POLL at each turn of a loop that polls a byte an interrupt changes, { cycles: n } for a delay
//   loop's time, and { cp: a } at the checkpoints test/lockstep.js lists, as kit/c16/lockstep.js
//   describes. P.GEN lists them.
// - A byte an interrupt writes and the main program reads is read through B(a), P.irqByte: on the
//   page that is M[a]; in the lockstep it is what the game's code read there. Every read the
//   game's code makes of one of them goes through it, in the game's order, so that each gets the
//   value the game's read got (the bytes are P.IRQ_BYTES).
// - N counts the work inside routines whose length varies, for the page's pacing (runtime.js):
//   piece, the characters next_pipe_piece lays out; spin, the turns draw_hiscores waits on timer 1;
//   cell and wipe, an enemy's cells drawn and wiped; ring, the explosion's cells; legs, logo and
//   chars, the frames animate_legs, cycle_logo_colours and animate_menu_chars do their work.
// - Each group keeps its helpers to itself (at, the address (pointer),y reaches), so that P holds
//   only the game's routines, which the lockstep and the page count as calls.
(function (root) {
'use strict';
const G = root.TexGroups = root.TexGroups || {};
const POLL = Object.freeze({ poll: true });

// The game's zero page, by the listing's names.
const Z = Object.freeze({
  message_ptr: 0x02, skyline_cols_left: 0x04, skyline_char: 0x05, skyline_scroll: 0x06, ctl_left: 0x07,
  ctl_right: 0x08, ctl_up: 0x09, ctl_down: 0x0A, ctl_fire: 0x0B, ctl_any: 0x0C, rnd0: 0x0D, rnd1: 0x0E,
  rnd2: 0x0F, rnd3: 0x10, text_cell: 0x11, tex_cell: 0x15, tex_colour_cell: 0x17, tex_colour: 0x19,
  pipe_scroll: 0x1B, message_scroll: 0x1C, skyline_cell: 0x1D, char_counter: 0x1F, leg_delay: 0x20,
  leg_frame: 0x21, bullet_flying: 0x22, jumping: 0x23, jump_steps: 0x24, tex_moved: 0x25, bullet_cell: 0x26,
  pressure_fine: 0x28, pressure_cells: 0x29, completed_fine: 0x2A, completed_cells: 0x2B, work_ptr: 0x2C,
  piece_index: 0x2E, piece_char: 0x2F, piece_length: 0x30, row_ptr: 0x33, colour_ptr: 0x35, refilling: 0x37,
  menu_on: 0x38, name_colour_cell: 0x39, arrow_cell: 0x3B, jet_cell: 0x3D, arrow_colour_cell: 0x3F,
  jet_colour_cell: 0x41, bouncy_cell: 0x43, bouncy_colour_cell: 0x45, bouncy_old_cell: 0x47,
  jet_bomb_cell: 0x49, explosive_cell: 0x4B, explosive_old_cell: 0x4D, explosive_colour_cell: 0x4F,
  explosion_cell: 0x51, explosion_colour_cell: 0x53, glyph_cell: 0x55, glyph_ptr: 0x57,
  glyph_colour_cell: 0x59, break_cell: 0x5B, the_cell: 0x5D, end_cell: 0x5F, last_skyline: 0x61, level: 0x62,
  break_parts: 0x64, star_step: 0x66, star_timer: 0x67, loop_pace: 0x68, drain_rate: 0x69,
  message_colour: 0x6A, irq_band: 0x6B, skyline_speed: 0x6C, pipe_speed: 0x6D, move_timer: 0x6E,
  pressure_gone: 0x6F, speed: 0x70, left_blocked: 0x72, right_blocked: 0x73, half_rate: 0x74, skyline_bg: 0x75,
  pipe_bg: 0x76, jump_timer: 0x77, bullet_timer: 0x78, leg_timer: 0x79, dying: 0x7A, tex_hit: 0x7B,
  sink_timer: 0x7C, sink_steps: 0x7D, game_ended: 0x7E, controls_off: 0x7F, lives: 0x80, hiscore_offset: 0x81,
  hiscore_rank: 0x82, name_cursor: 0x83, entry_offset: 0x84, rank_digit: 0x85, name_offset: 0x86,
  row_colour: 0x87, digit_seen: 0x88, count: 0x89, item_work: 0x8A, legs_still: 0x8B, demo_ran: 0x8C,
  menu_done: 0x8D, menu_anim_timer: 0x8E, logo_timer: 0x90, unused_91: 0x91, roll3_count: 0x92,
  piece_pick: 0x93, field_colour1: 0x94, field_colour2: 0x95, field_bg: 0x96, skyline_colour1: 0x97,
  skyline_colour2: 0x98, skyline_cell_colour: 0x99, pipe_colour1: 0x9A, pipe_colour2: 0x9B,
  pipe_cell_colour: 0x9C, level_done: 0x9D, arrow_active: 0x9E, arrow_gone: 0x9F, arrow_timer: 0xA0,
  arrow_moved: 0xA1, jet_active: 0xA2, jet_gone: 0xA3, jet_timer: 0xA4, jet_moved: 0xA5, enemy_mask: 0xA6,
  arrow_colour: 0xA7, jet_colour: 0xA8, bouncy_active: 0xA9, bouncy_colour: 0xAA, bouncy_height: 0xAB,
  bouncy_moved: 0xAC, bouncy_gone: 0xAD, bouncy_steps: 0xAE, bouncy_down: 0xAF, bouncy_timer: 0xB0,
  break_timer: 0xB1, jet_drop_column: 0xB2, jet_bomb_moved: 0xB3, jet_bomb_rows: 0xB4, jet_bomb_falling: 0xB5,
  jet_bomb_colour: 0xB6, jet_bomb_timer: 0xB7, explosive_active: 0xB8, explosive_timer: 0xB9,
  explosive_row: 0xBA, explosive_flight: 0xBB, explosive_moved: 0xBC, explosive_gone: 0xBD,
  explosive_colour: 0xBE, explosive_level: 0xBF, tex_falling: 0xC1, exploding: 0xC2, explosion_step: 0xC3,
  explosion_shown: 0xC4, explosion_timer: 0xC5, ring_count: 0xC6, hit_char: 0xC7, shot_down: 0xC8,
  score_add: 0xC9, score_timer: 0xCA, scored: 0xCB, ring_colour: 0xCC, glyph_rows: 0xCD, countdown_step: 0xCE,
  glyph_bits: 0xCF, zpa_D0: 0xD0, drain_timer: 0xD1, pressure_loss: 0xD2, the_down: 0xD4, end_down: 0xD5,
  the_rows: 0xD6, end_rows: 0xD7, glyph_colour: 0xD8, paused: 0xD9, shot_playing: 0xDA, hit_playing: 0xDB,
  shot_freq_hi: 0xDC, shot_frames: 0xDD, saved_mask: 0xDF, keep_hud: 0xE0, bouncy_delay_base: 0xE1,
  explosive_delay_base: 0xE2, arrow_delay_base: 0xE3, jet_delay_base: 0xE4, spawn_threshold: 0xE5,
  quit_pressed: 0xE6, last_ten_thousands: 0xE7, menu_turns: 0xE8,
});
// The settings and tables above zero page that the routines read or write, by the listing's names.
const T = Object.freeze({
  scene: 0x1826, lives_setting: 0x1827, sound_on: 0x1828, menu_item: 0x1829, joystick_mode: 0x182A,
  difficulty: 0x182B, demo_mode: 0x182C, controls_fire_shift: 0x1878, raster_lines: 0x1880,
  tex_layout_operand: 0x1EAE, erase_layout_operand: 0x1ECF, tex_hit_value: 0x1EB7, hole_hit_value: 0x1EEC,
  completed_cells_full: 0x2255, digit_dec: 0x249D, lives_dec: 0x24A0, level_store: 0x2A0B,
});

// The routines that are generators: those whose code can reach a wait, or a checkpoint.
const GEN = new Set(['program', 'start', 'menu', 'check_hiscore', 'enter_hiscore', 'delay', 'start_game', 'next_level',
  'countdown', 'main_loop', 'level_complete', 'pressure_out', 'game_over', 'quit_game', 'the_end',
  'irq', 'irq_field', 'tex_death']);
// Bytes an interrupt writes that the main program reads while interrupts are let in: the controls
// read_controls fills (menu_input and enter_hiscore read them), the random bytes irq_field's call
// of random stirs (move_bombs draws on them), speed and enemy_mask, and the flags main_loop and
// level_complete test (pressure_gone, tex_hit, game_ended, level_done, paused, quit_pressed).
const IRQ_BYTES = [0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0D, 0x0E, 0x0F, 0x10, 0x6F, 0x70, 0x7B, 0x7E, 0x9D, 0xA6, 0xD9, 0xE6];

// The 6502's ADC in decimal mode, as the NMOS part gives A and the carry.
function adcD(a, b, c) {
  let al = (a & 0x0F) + (b & 0x0F) + c;
  if (al >= 0x0A) al = ((al + 0x06) & 0x0F) + 0x10;
  let t = (a & 0xF0) + (b & 0xF0) + al;
  if (t >= 0xA0) t += 0x60;
  return { a: t & 0xFF, c: t >= 0x100 ? 1 : 0 };
}

function makePort(M, io, opts = {}) {
  const P = { M, Z, T, POLL, GEN, IRQ_BYTES, adcD };
  // P.io is one object for good, so that a routine may keep it: giving P a new set of chips (the
  // lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  P.N = { piece: 0, spin: 0, cell: 0, wipe: 0, ring: 0, legs: 0, logo: 0, chars: 0 };
  for (const name of Object.keys(G)) G[name](P);
  return P;
}
root.TexPort = { makePort, POLL, GEN, IRQ_BYTES, Z, T, adcD };
})(typeof window !== 'undefined' ? window : globalThis);
