// The main program: new_game (the title and the menu), start_turn, room_start, main_loop and the
// death sequence; setup_machine; the panel (draw_lives, the clock, the vitamin count, the EGY bar);
// the title's text and dots; delay and the sound's small routines.
(function (root) {
'use strict';
(root.PuniGroups = root.PuniGroups || {}).main = function (P) {
const M = P.M, io = P.io, Z = P.Z, T = P.T, B = P.irqByte, POLL = P.POLL, N = P.N;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;
// A JSR delay at a, with Y = y: the checkpoints before it and after.
function* wait(a, y) { yield { cp: a }; yield* P.delay({ y }); yield { cp: a + 3 }; }
// Where the game goes from j_25C5: PLA, PLA, JMP death; or, with Plus/4 World's RTS poked there
// (cheats.md), back to the caller's caller.
const kill = () => (M[0x25C5] === 0x60 ? undefined : 'death');

// The program from entry ($1AF4, JMP new_game): each part returns the part the game goes to next.
P.program = function* () {
  let next = 'new_game';
  for (;;) next = yield* P[next]();
};
P.entry = P.program;

// Y times 256 turns of X (delay, $2111): 1,284 cycles a unit of Y, with the JSR and RTS 13 more;
// Y = 0 is 256.
P.delay = function* (r) {
  yield { cycles: 1284 * (r.y || 0x100) + 13 };
  return { x: 0, y: 0 };
};

// The game's start (new_game, $31F5): the machine set up, the players' variables cleared, the
// lives drawn; no key; the title, a dot each 255 turns, until RETURN, and let go; the menu until
// F1, F2, F3 or HELP.
P.new_game = function* () {
  P.setup_machine();
  P.clear_play_area();
  for (let x = 0; x < 0x3A; x++) M[T.lives + x] = 0;
  M[T.anim_phase] = 0;
  // the interrupts setup_machine let in come before the wait for no key reads the key code: here,
  // at the JSR draw_lives, rather than at the wait's first turn
  yield { cp: 0x3209 };
  P.draw_lives();
  while (B(Z.key_code) !== 0x40) yield POLL;
  M[0x4C] = 0xFF; M[0x4D] = 0x01; M[0x4F] = 0x01; M[0x4E] = 0xD7;
  P.print_title_text();
  do {
    yield { cp: 0x3225 };
    yield* P.title_dot_step({ y: 0x0A });
  } while (B(Z.key_code) !== 0x01);
  while (B(Z.key_code) !== 0x40) yield POLL;
  P.clear_play_area();
  P.show_menu();
  for (;;) {
    const a = B(Z.key_code);
    if (a === 0x04) { M[T.active] = 1; M[T.lives] = 8; break; }
    if (a === 0x05) { M[T.active] = 1; M[T.keyboard] = 1; M[T.lives] = 8; break; }
    if (a === 0x06) { M[T.active] = 1; M[T.active + 1] = 1; M[T.lives] = 8; M[T.lives + 1] = 8; break; }
    if (a === 0x03) { M[T.active] = 1; M[T.active + 1] = 1; M[T.keyboard] = 1; M[T.lives] = 8; M[T.lives + 1] = 8; break; }
    yield POLL;
  }
  return 'start_turn';
};

// A turn's start (start_turn, $328F): the lives, GET READY, the tune off and the volume up, the EGY
// bar filled; then the room.
P.start_turn = function* () {
  P.draw_lives();
  P.clear_play_area();
  P.show_get_ready();
  M[T.music_on] = 0;
  io.write(0xFF11, 0x0F);
  yield* P.refill_energy();
  return 'room_start';
};

// The room's start (room_start, $32A5): the energy counter to 1, the room drawn, the player built
// over it; then the main loop.
P.room_start = function* () {
  M[T.energy_count] = 0x01;
  P.clear_play_area();
  P.draw_room();
  P.save_under_player();
  P.copy_under_glyphs();
  P.merge_player();
  P.draw_player();
  return yield* P.main_loop();
};

// The main loop ($32BC): six routines a pass, until a death or the next room.
P.main_loop = function* () {
  for (;;) {
    yield { cp: 0x32BC };
    let next = yield* P.player_pass();
    if (next) return next;
    yield { cp: 0x32BF }; P.animate_chars();
    yield { cp: 0x32C2 }; P.rotate_vitamin_chars();
    yield { cp: 0x32C5 }; P.update_objects();
    yield { cp: 0x32C8 };
    next = P.clock_tick();
    if (next) return next;
    yield { cp: 0x32CB };
    if (P.energy_tick().c) return 'death';
  }
};

// The death sequence (death, $32D0): the noise, the bar emptied, the scenery put back; the room's
// background stepped through the colours while the noise rises, the room still moving; the play
// area cleared and the volume faded; a life lost, and the next player's turn, or GAME OVER and the
// game's start.
P.death = function* () {
  P.death_sound();
  io.write(0xFF0F, 0x90);
  io.write(0xFF10, 0x03);
  for (let x = 0; x < 0x22; x++) M[T.egy_bar + x] = 0x71;
  M[T.bar_pos] = 0;
  const colour = M[T.room_colours];
  const u = T.under_player, bp = Z.block_ptr;
  M[at(bp, 0x00)] = M[u]; M[at(bp, 0x01)] = M[u + 3];
  M[at(bp, 0x28)] = M[u + 1]; M[at(bp, 0x29)] = M[u + 4];
  M[at(bp, 0x50)] = M[u + 2]; M[at(bp, 0x51)] = M[u + 5];
  do {
    M[T.room_colours] = (M[T.room_colours] + 1) & 0xFF;
    yield* wait(0x3320, 0x0A);
    const v = io.read(0xFF0F);                           // INC $FF0F
    io.write(0xFF0F, v);
    io.write(0xFF0F, (v + 1) & 0xFF);
    P.update_objects();
  } while (io.read(0xFF0F) !== 0xFD);
  io.write(0xFF0F, 0xA0);
  M[T.room_colours] = colour;
  M[T.clock_count] = 0x01;
  P.clear_play_area();
  do {
    M[0x43] = io.read(0xFF11) & 0x0F;
    M[0x43] = (M[0x43] - 1) & 0xFF;
    io.write(0xFF11, (io.read(0xFF11) & 0xF0) | M[0x43]);
    yield* wait(0x3356, 0);
  } while (M[0x43] !== 0);
  io.write(0xFF11, 0x0F);
  const x = M[T.player];
  if (M[0x3367] === 0xDE) M[T.lives + x] = (M[T.lives + x] - 1) & 0xFF;   // DEC lives,X, or the poke's LDA (cheats.md)
  if (M[T.lives + x] === 0) M[T.active + x] = 0;
  if (M[T.active] === 0 && M[T.active + 1] === 0) {
    P.show_game_over();
    yield { cp: 0x339C }; yield* P.delay({ y: 0 });
    yield { cp: 0x339F }; yield* P.delay({ y: 0 });
    yield { cp: 0x33A2 }; yield* P.delay({ y: 0 });
    yield { cp: 0x33A5 }; yield* P.delay({ y: 0 });
    yield { cp: 0x33A8 };
    return 'new_game';
  }
  do M[T.player] ^= 0x01; while (M[T.active + M[T.player]] !== 0x01);
  return 'start_turn';
};
// The tune off and the death's noise on, at volume 15 (death_sound, $3402).
P.death_sound = function () {
  M[T.music_on] = 0;
  io.write(0xFF11, 0x4F);
};

// The EGY bar (energy_tick, $33AB): the carry set when it has run out.
P.energy_tick = function () {
  if (M[0x33AB] === 0xCE) M[T.energy_count] = (M[T.energy_count] - 1) & 0xFF;   // DEC, or the poke's LDA (cheats.md)
  if (M[T.energy_count] !== 0) return { c: 0 };
  M[T.energy_count] = M[T.energy_rate];
  const x = M[T.bar_pos], cell = T.egy_bar + x;
  if (M[T.energy_mode] === 0x01) {
    M[cell] = (M[cell] + 1) & 0xFF;
    if (M[cell] < 0x71) return { c: 0 };
    M[cell] = 0x71;
    M[T.bar_pos] = (M[T.bar_pos] - 1) & 0xFF;
    return { c: M[T.bar_pos] === 0xFF ? 1 : 0 };
  }
  if (x === 0x21) return { c: 0 };
  M[cell] = (M[cell] - 1) & 0xFF;
  if (M[cell] >= 0x6E) return { c: 0 };
  M[cell] = 0x6D;
  M[T.bar_pos] = (M[T.bar_pos] + 1) & 0xFF;
  return { c: 0 };
};

// The TIME clock (clock_tick, $268A): every 71st pass its last digit goes up, carrying; at 4.00
// the player's lives become 1 and he dies.
P.clock_tick = function () {
  M[T.clock_count] = (M[T.clock_count] - 1) & 0xFF;
  if (M[T.clock_count] !== 0xFF) return;
  M[T.clock_count] = 0x46;
  let x = M[T.player];
  if (x === 0x01) x = 0x50;
  x = (x + 5) & 0xFF;
  let y = (M[0x0EFE + x] + 1) & 0xFF;
  if (y !== 0x2F) { P.draw_clock_digit({ a: y, x }); return; }
  P.draw_clock_digit({ a: 0x25, x });
  x = (x - 2) & 0xFF;
  y = (M[0x0EFE + x] + 1) & 0xFF;
  if (y !== 0x2F) { P.draw_clock_digit({ a: y, x }); return; }
  P.draw_clock_digit({ a: 0x25, x });
  x = (x - 3) & 0xFF;
  y = (M[0x0EFE + x] + 1) & 0xFF;
  P.draw_clock_digit({ a: y, x });
  if (y !== 0x29) return;
  M[T.lives + M[T.player]] = 0x01;
  return kill();
};
// A big digit of the clock at $0EFE+X (draw_clock_digit, $26ED).
P.draw_clock_digit = function (r) {
  const x = r.x;
  let a = r.a;
  M[0x0EFE + x] = a; a = (a + 0x0A) & 0xFF;
  M[0x0EFF + x] = a; a = (a + 0x0A) & 0xFF;
  M[0x0F26 + x] = a; a = (a + 0x0A) & 0xFF;
  M[0x0F27 + x] = a;
};
// One more vitamin on the panel (vitamin_count_up, $2060).
P.vitamin_count_up = function () {
  let x = M[T.player] === 0 ? 0x02 : 0x52;
  for (;;) {
    const y = (M[0x0F0E + x] + 1) & 0xFF;
    if (y !== 0x2F) { P.draw_big_digit({ a: y, x }); return; }
    P.draw_big_digit({ a: 0x25, x });
    x = (x - 2) & 0xFF;
  }
};
// A big digit of the vitamin count at $0F0E+X (draw_big_digit, $207F).
P.draw_big_digit = function (r) {
  const x = r.x;
  let a = r.a;
  M[0x0F0E + x] = a; a = (a + 0x0A) & 0xFF;
  M[0x0F0F + x] = a; a = (a + 0x0A) & 0xFF;
  M[0x0F36 + x] = a; a = (a + 0x0A) & 0xFF;
  M[0x0F37 + x] = a;
};

// The EGY bar filled from bar_pos, a step each delay of 10, with a rising tone (refill_energy, $2024).
P.refill_energy = function* () {
  P.voice2_on();
  io.write(0xFF10, 0x03);
  io.write(0xFF0F, 0x00);
  for (;;) {
    yield* wait(0x2033, 0x0A);
    io.write(0xFF0F, ((io.read(0xFF0F) + 1) & 0xFF) ^ 0x80);
    const cell = T.egy_bar + M[T.bar_pos];
    M[cell] = (M[cell] - 1) & 0xFF;
    if (M[cell] !== 0x6D) continue;
    M[T.bar_pos] = (M[T.bar_pos] + 1) & 0xFF;
    if (M[T.bar_pos] === 0x22) break;
  }
  M[T.bar_pos] = 0x21;
  P.voice2_off();
};

// Both players' lives (draw_lives, $1FE5), each row by draw_lives_row ($1FFA).
P.draw_lives = function () {
  M[0x49] = M[T.lives];
  P.draw_lives_row({ x: 0x00 });
  M[0x49] = M[T.lives + 1];
  P.draw_lives_row({ x: 0x50 });
};
P.draw_lives_row = function (r) {
  let x = r.x;
  for (let y = 8; y > 0; y--, x = (x + 1) & 0xFF) {
    M[0x49] = (M[0x49] - 1) & 0xFF;
    if (M[0x49] === 0xFF) { M[0x49] = 0; M[0x0F18 + x] = 0xD6; M[0x0F40 + x] = 0xD6; }
    else { M[0x0F18 + x] = 0x74; M[0x0F40 + x] = 0x75; }
  }
};

// The play area's 18 rows blanked (clear_play_area, $1FD2).
P.clear_play_area = function () {
  for (let x = 0; x < 0xF0; x++) { M[0x0C00 + x] = 0xD6; M[0x0CF0 + x] = 0xD6; M[0x0DE0 + x] = 0xD6; }
};
// GET READY and GAME OVER on row 9 (show_get_ready, $20B9; show_game_over, $20CC).
P.show_get_ready = function () { for (let x = 0; x < 9; x++) { M[0x0D77 + x] = M[0x37C5 + x]; M[0x0977 + x] = 0x71; } };
P.show_game_over = function () { for (let x = 0; x < 9; x++) { M[0x0D77 + x] = M[0x37BC + x]; M[0x0977 + x] = 0x71; } };
// The menu's two lines (show_menu, $20DF).
P.show_menu = function () {
  let x;
  for (x = 0; x < 0x18; x++) {
    M[0x0D21 + x] = M[0x37CE + x]; M[0x0D98 + x] = M[0x37E6 + x];
    M[0x0921 + x] = 0x71; M[0x0998 + x] = 0x71;
  }
  M[0x0D98 + x] = M[0x37E6 + x];
  x++;
  M[0x0D98 + x] = M[0x37E6 + x];
  M[0x0998 + x] = 0x71;
  M[0x0998 + x - 1] = 0x71;
};
// The title's three lines of text (print_title_text, $1BEA).
P.print_title_text = function () {
  for (let x = 0; x < 0x15; x++) {
    const a = M[0x1BBE + x] & 0x3F;
    M[0x0C32 + x] = a === 0x20 ? 0xD6 : a;
    M[0x0832 + x] = 0x71;
  }
  for (let x = 0; x < 0x15; x++) {
    const a = M[0x1BA9 + x] & 0x3F;
    M[0x0C82 + x] = a === 0x20 ? 0xD6 : a;
    M[0x0882 + x] = 0x77;
  }
  for (let x = 0; x < 0x17; x++) {
    let a = M[0x1BD3 + x] & 0x3F;
    if (a === 0x20) a = 0xD6;
    else if (a >= 0x30) a = (a & 0x0F) + 0x1B;
    M[0x0E61 + x] = a;
    M[0x0A61 + x] = 0x72;
  }
};
// A dot of the title every 255th call (title_dot_step, $1C46): a delay of 42, the vitamin turned,
// and a dot at $4A/$4B along title_path.
P.title_dot_step = function* () {
  M[0x4D] = (M[0x4D] - 1) & 0xFF;
  if (M[0x4D] !== 0) return;
  M[0x4D] = 0xFF;
  yield* wait(0x1C51, 0x2A);
  P.rotate_vitamin_chars();
  M[0x4F] = (M[0x4F] - 1) & 0xFF;
  if (M[0x4F] === 0) {
    for (;;) {                                             // j_1C5F
      M[0x4C] = (M[0x4C] + 1) & 0xFF;
      let x = M[0x4C];
      const a = M[T.title_path + x];
      if (a === 0x00) {
        x = (x + 1) & 0xFF; M[0x4A] = M[T.title_path + x];
        x = (x + 1) & 0xFF; M[0x4B] = M[T.title_path + x];
        M[0x4C] = x;
        continue;
      }
      if (a === 0x01) { M[0x4C] = 0xFF; M[0x4E] ^= 0x01; continue; }
      M[0x4F] = a & 0x0F;
      M[0x49] = a & 0xF0;
      break;
    }
  }
  M[at(0x4A, 0)] = 0xD7;
  P.colour_ptr({ x: 0x4A });
  M[at(0x0A, 0)] = M[0x4E];
  if (M[0x49] & 0x10) P.ptr_up({ x: 0x4A });
  if (M[0x49] & 0x20) P.ptr_down({ x: 0x4A });
  if (M[0x49] & 0x40) P.ptr_right({ x: 0x4A });
  if (M[0x49] & 0x80) P.ptr_left({ x: 0x4A });
};

// The vitamin's four frames turned on by one (rotate_vitamin_chars, $2844).
P.rotate_vitamin_chars = function () {
  const s = M.slice(0x3EB8, 0x3EC0);
  M.copyWithin(0x3EB8, 0x3EC0, 0x3ED8);
  M.set(s, 0x3ED0);
};

// The machine set up for the game (setup_machine, $3075), with interrupts off: the sound, the
// character set, multicolour, the raster interrupt through irq, the border; row 18 blanked and the
// panel copied and coloured; both players' blocks; the tune on.
P.setup_machine = function () {
  io.sei();
  io.write(0xFF11, 0x0F);
  io.write(0xFF13, 0x38);
  io.write(0xFF12, io.read(0xFF12) & 0xFB);
  io.write(0xFF07, io.read(0xFF07) | 0x90);
  io.write(0xFF0A, 0x02);
  io.write(0xFF0B, 0x00);
  io.write(0xFF19, 0x06);
  M[0x0314] = 0x2E; M[0x0315] = 0x31;
  M[T.unused_0353] = 0x92;
  for (let x = 0; x < 0x28; x++) M[0x0ED0 + x] = 0xD6;
  for (let x = 0; x < 0xF0; x++) {
    const a = M[0x3EE0 + x];
    M[0x0EF8 + x] = a;
    M[0x0AF8 + x] = a < 0x24 ? 0x72 : a < 0x39 ? 0x67 : a < 0x4D ? 0x77 : a < 0x74 ? 0x08 : 0x71;
  }
  M[T.saved_ptr_lo] = 0x01; M[T.saved_ptr_lo + 1] = 0x01;
  M[Z.tune_frame] = 0xFF; M[Z.tune_step] = 0xFF;
  M[0x0FE7] = 0x77;
  M[0x0BE7] = M[0x0BE6];
  M[T.saved_ptr_lo] = 0x52; M[T.saved_ptr_lo + 1] = 0x52;
  M[T.saved_ptr_hi] = 0x0C; M[T.saved_ptr_hi + 1] = 0x0C;
  M[T.music_on] = 0x01;
  M[Z.tune_frame] = 0xFF; M[Z.tune_step] = 0xFF;
  M[Z.tune_volume] = 0x00;
  io.cli();
};

// TED's voices on and off ($2095-$20B8); voice 1's two, which nothing calls, as they are.
P.voice1_on_unused = function () { io.write(0xFF11, io.read(0xFF11) | 0x10); };
P.voice1_off_unused = function () { io.write(0xFF11, io.read(0xFF11) & 0xEF); };
P.voice2_on = function () { io.write(0xFF11, io.read(0xFF11) | 0x20); };
P.voice2_off = function () { io.write(0xFF11, io.read(0xFF11) & 0xDF); };

// The pointers' small sums: A added to rec_ptr (add_to_ptr43, $1CCB); the colour's address of the
// cell the zero-page pointer X names, into $0A/$0B (colour_ptr, $1CD7); that pointer a row down or
// up, a column right or left ($1CE3-$1D10). Each returns the carry its last ADC or SBC leaves.
P.add_to_ptr43 = function (r) {
  const t = M[0x43] + r.a;
  M[0x43] = t & 0xFF;
  const h = M[0x44] + (t >> 8);
  M[0x44] = h & 0xFF;
  return { c: h >> 8 };
};
P.colour_ptr = function (r) {
  const x = r.x;
  M[0x0A] = M[x];
  const h = M[(x + 1) & 0xFF] - 4;
  M[0x0B] = h & 0xFF;
  return { c: h >= 0 ? 1 : 0 };
};
function add(x, d) {
  const t = M[x] + d, x1 = (x + 1) & 0xFF;
  M[x] = t & 0xFF;
  const h = M[x1] + (t >> 8);
  M[x1] = h & 0xFF;
  return { c: h >> 8 };
}
function sub(x, d) {
  const t = M[x] - d, x1 = (x + 1) & 0xFF;
  M[x] = t & 0xFF;
  const h = M[x1] - (t < 0 ? 1 : 0);
  M[x1] = h & 0xFF;
  return { c: h >= 0 ? 1 : 0 };
}
P.ptr_down = function (r) { return add(r.x, 0x28); };
P.ptr_right = function (r) { return add(r.x, 0x01); };
P.ptr_up = function (r) { return sub(r.x, 0x28); };
P.ptr_left = function (r) { return sub(r.x, 0x01); };
};
})(typeof window !== 'undefined' ? window : globalThis);
