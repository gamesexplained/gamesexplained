// The main program: start, start_game and main_loop, the levels (next_level, level_complete) and
// the end of a game (pressure_out, game_over, quit_game); delay and clear_zero_page.
(function (root) {
'use strict';
(root.TexGroups = root.TexGroups || {}).main = function (P) {
const M = P.M, io = P.io, Z = P.Z, T = P.T, B = P.irqByte, POLL = P.POLL;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;
const step = (z, d) => {
  const s = M[z] + d;
  M[z] = s & 0xFF;
  M[z + 1] = (M[z + 1] + (s > 0xFF ? 1 : 0)) & 0xFF;
};
// A JSR delay at a, with X = x: the checkpoints before it and after.
function* wait(a, x) { yield { cp: a }; yield* P.delay({ x }); yield { cp: a + 3 }; }

// X times 256 turns of three NOPs (delay, $1922): the game's only clock outside the interrupt.
// 2,820 cycles a turn of X, with the JSR and RTS 13 more; X = 0 is 256.
P.delay = function* (r) {
  yield { cycles: 2820 * (r.x || 0x100) + 13 };
  return { x: 0, y: 0 };
};
// Zero page from $07 up (clear_zero_page, $1964).
P.clear_zero_page = function () { for (let x = 0x07; x <= 0xFF; x++) M[x] = 0; };

// The game's start ($1800, where the loader jumps): the screen cleared through the KERNAL's CHROUT
// (the kit's machine stands in for it with spaces in the screen), the message's start, and the
// pipe and the skyline scrolled on 46 columns; then menu.
P.start = function* () {
  io.sei();
  P.clear_zero_page();
  M.fill(0x20, 0x0C00, 0x0FE8);                            // JSR $FFD2 with $93
  M[Z.message_ptr] = 0xAA; M[Z.message_ptr + 1] = 0x22;
  P.next_pipe_piece();
  for (let y = 0x2D; y >= 0; y--) { P.shift_pipe(); P.shift_skyline(); }
};
P.program = function* () {
  yield* P.start();
  for (;;) { yield* P.menu(); yield* P.start_game(); yield* P.main_loop(); }
};

// A game's start (start_game, $29D3, where menu jumps): zero page cleared, the lives from the menu,
// the HUD, Tex at the left of the pipe; the first level (or, with Plus/4 World's patch at $2A0B,
// the level after the one its LDA at cheat_space loads) and the countdown.
P.start_game = function* () {
  P.erase_tex();
  io.sei();
  P.clear_zero_page();
  M[Z.lives] = M[T.lives_setting];
  for (const z of [Z.left_blocked, Z.move_timer, Z.break_timer, Z.score_timer, Z.drain_timer, Z.star_timer]) M[z] = 0x01;
  P.clear_play_area();
  P.draw_hud();
  M[0x0C65] = M[0x28A1];
  M[Z.tex_cell] = 0xA9; M[Z.tex_cell + 1] = 0x0E;
  P.draw_tex();
  io.cli();
  M[Z.controls_off] = 0x01; M[Z.menu_on] = 0x01;
  if (M[T.level_store] === 0x20 && M[T.level_store + 1] === 0xE3 && M[T.level_store + 2] === 0x36) M[Z.level] = M[0x36E4];
  else M[Z.level] = 0;                                     // DEX, STX level
  M[T.scene] = 0xFF;
  yield* P.next_level();
  P.draw_pressure_bar();
  P.draw_completed_bar();
  yield* P.countdown();
  M[Z.controls_off] = 0; M[Z.menu_on] = 0;
};

// The main loop ($2A24): held while paused; the game's end, or ESC; then a delay of loop_pace
// turns, the pressure down an eighth each drain_rate turns, the bombs moved, and while Tex runs a
// point and some % COMPLETED (by his speed) each 24 turns; the level's end, or the pressure's.
P.main_loop = function* () {
  for (;;) {
    while (B(Z.paused) !== 0) yield POLL;
    yield { cp: 0x2A28 };
    if (B(Z.game_ended) !== 0) return yield* P.game_over();
    if (B(Z.quit_pressed) !== 0) return yield* P.quit_game();
    yield* wait(0x2A35, M[Z.loop_pace]);
    M[Z.drain_timer] = (M[Z.drain_timer] - 1) & 0xFF;
    if (M[Z.drain_timer] === 0) {
      M[Z.drain_timer] = M[Z.drain_rate];
      yield { cp: 0x2A42 }; P.lose_pressure({ a: 0x01 });
    }
    yield { cp: 0x2A45 }; P.move_bombs();
    if (B(Z.speed) !== 0) {
      M[Z.score_timer] = (M[Z.score_timer] - 1) & 0xFF;
      if (M[Z.score_timer] === 0) {
        M[Z.score_timer] = 0x18;
        yield { cp: 0x2A56 }; P.add_score_units({ a: 0x01 });
        const x = B(Z.speed);
        yield { cp: 0x2A5E }; P.add_completed({ a: M[0x2A99 + x] });
      }
    }
    if (B(Z.level_done) !== 0) { yield { cp: 0x2A65 }; yield* P.level_complete(); }
    if (B(Z.pressure_gone) !== 0) return yield* P.pressure_out();
  }
};

// The next level (next_level, $3A31): its number up (in decimal), the next scene; the enemies:
// one each on levels 1 to 3, a random pair on 4 to 6, three on 7 to 9 and all four from 10, the
// jet's bombs from 7; how soon they come, by the level; the main loop's pace and the pressure's
// drain, by the difficulty; the scene's colours and shapes, the pipe laid again and both bars
// reset.
P.next_level = function* () {
  M[Z.level] = P.adcD(M[Z.level], 0x01, 0).a;
  let x = (M[T.scene] + 1) & 0xFF;
  if (x === 0x03) x = 0;
  M[T.scene] = x;
  const L = M[Z.level];
  if (L < 0x04) { M[Z.spawn_threshold] = 0xB0; M[Z.break_parts] = 0x02; } else M[Z.break_parts] = 0x03;
  if (L === 0x01) M[Z.enemy_mask] = 0x04;
  else if (L === 0x02) M[Z.enemy_mask] = 0x02;
  else if (L === 0x03) M[Z.enemy_mask] = 0x08;
  else if (L < 0x07) {
    let c = 0;                                             // the carry from CMP #$07, then CMP #$06
    for (;;) {                                             // b_3A7D
      io.sei(); P.random({ c }); io.cli();
      const a = B(Z.rnd2) & 0x07;                          // read before the interrupt the CLI lets in
      yield { cp: 0x3A84 };
      if (a < 0x06) { M[Z.enemy_mask] = M[0x3B14 + a]; break; }
      c = 1;
    }
    M[Z.spawn_threshold] = 0x80;
  } else if (L < 0x0A) {
    io.sei(); P.random({ c: 0 }); io.cli();
    const a = B(Z.rnd3) & 0x03;
    yield { cp: 0x3AA1 };
    M[Z.enemy_mask] = M[0x3B1A + a];
    M[Z.spawn_threshold] = 0x40;
  } else { M[Z.enemy_mask] = 0x0F; M[Z.spawn_threshold] = 0x01; }
  if (M[Z.level] >= 0x07) M[Z.enemy_mask] = B(Z.enemy_mask) | 0x10;
  const d = M[0x3A27 + ((M[Z.level] & 0x60) >> 5)];
  M[Z.bouncy_delay_base] = d; M[Z.explosive_delay_base] = d; M[Z.arrow_delay_base] = d; M[Z.jet_delay_base] = d;
  x = M[T.difficulty];
  M[Z.loop_pace] = M[0x3A2B + x]; M[Z.drain_rate] = M[0x3A2E + x];
  P.set_scene_colours();
  M[Z.keep_hud] = 0x01;
  P.draw_hud();
  M[Z.keep_hud] = (M[Z.keep_hud] - 1) & 0xFF;
  P.set_scene_graphics();
  yield { cp: 0x3AF4 }; P.refill_pipe(); yield { cp: 0x3AF7 };
  M[Z.pressure_cells] = 0x19; M[Z.pressure_fine] = 0x07;
  M[Z.pressure_gone] = 0; M[Z.completed_fine] = 0; M[Z.completed_cells] = 0; M[Z.demo_ran] = 0;
  M[Z.bouncy_timer] = 0x0C; M[Z.explosive_timer] = 0x0C; M[Z.arrow_timer] = 0x0C; M[Z.jet_timer] = 0x0C;
};

// A level complete (level_complete, $38A2), once Tex is not being hit: the pipe laid, the play area
// cleared but for Tex, CONGRATULATIONS ! and LEVEL nn COMPLETED in a box; then the pressure left
// turned into points, a point an eighth, with a rising tone (voice 2) while SOUND is on; a pause of
// six delays, and the next level.
P.level_complete = function* () {
  while (B(Z.tex_hit) !== 0) yield POLL;
  yield { cp: 0x38A6 }; P.refill_pipe(); yield { cp: 0x38A9 };
  io.sei();
  M[Z.controls_off] = 0x01;
  M[Z.skyline_speed] = 0; M[Z.pipe_speed] = 0; M[Z.jumping] = 0; M[Z.bullet_flying] = 0;
  P.clear_enemies();
  P.erase_tex();
  M[Z.tex_cell] = 0xA9; M[Z.tex_cell + 1] = 0x0E;
  M[Z.speed] = 0; M[Z.right_blocked] = 0; M[Z.level_done] = 0;
  P.clear_play_area();
  P.draw_tex();
  io.cli();
  for (let y = 0x14; y >= 0; y--) {
    M[0x0DC2 + y] = 0x2A; M[0x0E62 + y] = 0x2A;
    M[0x0E12 + y] = M[0x395F + y] & 0x3F;
    M[0x0EB2 + y] = M[0x3974 + y] & 0x3F;
  }
  M[0x0DEA] = 0x2A; M[0x0E3A] = 0x2A; M[0x0DFE] = 0x2A; M[0x0E4E] = 0x2A;
  M[0x0EBA] = (M[Z.level] >> 4) | 0x30;
  M[0x0EBB] = (M[Z.level] & 0x0F) | 0x30;
  if (M[T.sound_on] !== 0) { io.write(0xFF11, 0x23); io.write(0xFF10, 0x03); }
  do {                                                     // b_3925
    P.add_score_units({ a: 0x01 });
    P.lose_pressure({ a: 0x01 });
    io.write(0xFF0F, ((M[Z.pressure_cells] << 3) & 0xFF) | M[Z.pressure_fine]);
    yield* wait(0x393B, 0x08);
  } while (B(Z.pressure_gone) === 0);
  io.write(0xFF11, 0);
  M[Z.work_ptr] = 0x06;
  do {
    yield* wait(0x394D, 0);
    M[Z.work_ptr] = (M[Z.work_ptr] - 1) & 0xFF;
  } while (M[Z.work_ptr] !== 0);
  yield* P.next_level();
  P.clear_play_area();
  M[Z.controls_off] = 0;
};

// The pressure gone (pressure_out, $3989): the pipe laid, the enemies and the play area cleared,
// Tex standing in the middle, and the bad news told in a box a letter each delay of 32 turns; then
// ten delays more, and the game is over.
P.pressure_out = function* () {
  yield { cp: 0x3989 }; P.refill_pipe(); yield { cp: 0x398C };
  io.sei();
  M[Z.controls_off] = 0x01; M[Z.menu_on] = 0x01;
  M[Z.enemy_mask] = 0; M[Z.speed] = 0; M[Z.skyline_speed] = 0; M[Z.pipe_speed] = 0; M[Z.jumping] = 0; M[Z.bullet_flying] = 0;
  P.clear_enemies();
  P.clear_play_area();
  M[Z.tex_cell] = 0xBA; M[Z.tex_cell + 1] = 0x0E;
  P.draw_tex();
  io.cli();
  for (let y = 0x1D; y >= 0; y--) { M[0x0D6D + y] = 0x2A; M[0x0E5D + y] = 0x2A; }
  for (let x = 5; x >= 0; x--) { const y = M[0x19A6 + x]; M[0x0D95 + y] = 0x2A; M[0x0DB2 + y] = 0x2A; }
  M[Z.colour_ptr] = 0xC1; M[Z.colour_ptr + 1] = 0x19;    // bad_news_text
  M[Z.text_cell] = 0x96; M[Z.text_cell + 1] = 0x0D;
  for (let x = 4; x >= 0; x--) {
    for (let y = 0; y !== 0x1C; y++) {
      M[at(Z.text_cell, y)] = M[at(Z.colour_ptr, y)] & 0x3F;
      yield* wait(0x39EE, 0x20);
    }
    step(Z.colour_ptr, 0x1C);
    step(Z.text_cell, 0x28);
  }
  M[Z.work_ptr] = 0x0A;
  do {
    yield* wait(0x3A1D, 0);
    M[Z.work_ptr] = (M[Z.work_ptr] - 1) & 0xFF;
  } while (M[Z.work_ptr] !== 0);
  yield* P.game_over();
};

// The game over (game_over, $2A72): from the demo, quit_game first; THE END, and the score kept
// in final_score for the menu's check_hiscore.
P.game_over = function* () {
  if (M[T.demo_mode] !== 0) return yield* P.quit_game();
  io.sei();
  M[Z.controls_off] = 0x01; M[Z.menu_on] = 0x01;
  M[Z.paused] = 0;
  P.clear_enemies();
  P.clear_play_area();
  io.cli();
  yield* P.the_end();
  for (let x = 5; x >= 0; x--) M[0x261F + x] = M[0x0C56 + x];
};
// ESC, or the demo's end: the score set to 000000, and game_over (quit_game, $2AA1).
P.quit_game = function* () {
  io.sei();
  for (let x = 5; x >= 0; x--) M[0x0C56 + x] = 0x30;
  M[Z.quit_pressed] = 0; M[Z.bullet_flying] = 0; M[Z.jumping] = 0; M[T.demo_mode] = 0;
  M[Z.refilling] = 0x01;
  yield* P.game_over();
};
};
})(typeof window !== 'undefined' ? window : globalThis);
