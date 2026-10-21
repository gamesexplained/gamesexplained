// The menu (menu, menu_input, menu_choose, draw_menu, draw_menu_frame, show_logo_chars) and the
// high scores (check_hiscore, enter_hiscore, colour_name_cursor, draw_hiscores).
(function (root) {
'use strict';
(root.TexGroups = root.TexGroups || {}).menu = function (P) {
const M = P.M, io = P.io, Z = P.Z, T = P.T, B = P.irqByte;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;
const step = (z, d) => {
  const s = M[z] + d;
  M[z] = s & 0xFF;
  M[z + 1] = (M[z + 1] + (s > 0xFF ? 1 : 0)) & 0xFF;
};
function* wait(a, x) { yield { cp: a }; yield* P.delay({ x }); yield { cp: a + 3 }; }

// The menu ($2B65, where start and game_over jump): the scene's colours, Tex standing in the play
// area, the frame, the menu and the high scores; a score that makes the table entered; then a
// delay of 64 turns, the table redrawn and the controls read, until PLAY THE GAME or WATCH THE DEMO
// is chosen or 255 turns have gone by, which starts the demo. The enemies' characters, which the
// logo borrowed, go back, and start_game follows.
P.menu = function* () {
  io.sei();
  M[Z.controls_off] = 0x01; M[Z.menu_on] = 0x01;
  P.set_scene_colours();
  P.seed_random();
  M[Z.field_bg] = 0x70; M[Z.pipe_bg] = 0x70;
  M[Z.tex_colour] = 0x71; M[Z.message_colour] = 0x71;
  P.clear_play_area();
  M[Z.field_colour1] = 0x32; M[Z.field_colour2] = 0x62;
  M[Z.tex_cell] = 0xBB; M[Z.tex_cell + 1] = 0x0E;
  P.draw_tex();
  M[Z.pipe_speed] = 0x03; M[Z.leg_delay] = 0x07;
  M[Z.menu_anim_timer] = 0x02; M[Z.logo_timer] = 0x02; M[Z.unused_91] = 0x02;
  M[Z.skyline_speed] = 0x01; M[Z.leg_timer] = 0x01; M[Z.speed] = 0x01; M[Z.refilling] = 0x01;
  M[Z.menu_done] = 0; M[Z.bullet_flying] = 0; M[T.demo_mode] = 0; M[Z.menu_turns] = 0;
  P.draw_hud();
  P.draw_menu_frame();
  P.draw_menu();
  P.install_irq();
  io.cli();
  yield { cp: 0x2BC3 };
  yield* P.check_hiscore();
  for (;;) {                                               // b_2BC6
    M[Z.menu_turns] = (M[Z.menu_turns] + 1) & 0xFF;
    if (M[Z.menu_turns] === 0) { M[T.demo_mode] = 0x01; break; }
    yield* wait(0x2BCC, 0x40);
    P.draw_hiscores();
    yield { cp: 0x2BD2 };
    P.menu_input();
    if (M[Z.menu_done] !== 0) break;
  }
  for (let x = 0x6F; x >= 0; x--) M[0x3EE8 + x] = M[0x0560 + x];
};

// The last game's score against each entry of the table from the top, digit by digit; at the
// first it beats, it is entered there (check_hiscore, $2625).
P.check_hiscore = function* () {
  M[Z.hiscore_offset] = 0; M[Z.hiscore_rank] = 0;
  for (;;) {
    let x = (M[Z.hiscore_offset] + 0x06) & 0xFF, c = 1;
    for (let y = 0x06; y !== 0; y--) {                     // SBC down the six digits
      const t = M[(0x1A4C + x) & 0x3FFF] - M[0x261E + y] - (1 - c);
      c = t >= 0 ? 1 : 0;
      x = (x - 1) & 0xFF;
    }
    if (!c) { yield* P.enter_hiscore(); P.draw_hiscores(); return; }
    M[Z.hiscore_offset] = (M[Z.hiscore_offset] + 0x0E) & 0xFF;
    M[Z.hiscore_rank] = (M[Z.hiscore_rank] + 1) & 0xFF;
    if (M[Z.hiscore_rank] === 0x08) return;
  }
};
// The table moved down from hiscore_rank (the first byte of each entry it moves stays), the score
// put in and final_score set to 000000; then the name typed: up and down step its letter at the
// cursor, left and right move the cursor, a delay of 48 turns each time round, until fire
// (enter_hiscore, $266F).
P.enter_hiscore = function* () {
  M[Z.entry_offset] = M[0x2657 + M[Z.hiscore_rank]];
  if (M[Z.hiscore_rank] !== 0x07) {
    let x = 0x62;
    do { M[0x1A5B + x] = M[0x1A4D + x]; x = (x - 1) & 0xFF; } while (x !== M[Z.entry_offset]);
  }
  let x = M[Z.entry_offset];
  for (let y = 0; y !== 0x06; y++) { M[(0x1A4D + x) & 0x3FFF] = M[0x261F + y]; M[0x261F + y] = 0x30; x = (x + 1) & 0xFF; }
  P.draw_hiscores();
  const xi = (M[Z.hiscore_rank] << 1) & 0xFF;
  M[Z.row_ptr] = M[0x265F + xi]; M[Z.name_colour_cell] = M[0x265F + xi];
  M[Z.row_ptr + 1] = M[0x2660 + xi]; M[Z.name_colour_cell + 1] = (M[0x2660 + xi] - 0x04) & 0xFF;
  for (let y = 6; y >= 0; y--) M[0x2755 + y] = 0x01;
  M[Z.name_offset] = (M[Z.entry_offset] + 0x06) & 0xFF;
  M[Z.name_cursor] = 0;
  let first = true;                                        // JMP j_271E
  for (;;) {
    if (!first) {                                          // j_26CC
      let y = M[Z.name_cursor];
      if (B(Z.ctl_fire) & 0x80) return;
      if (B(Z.ctl_up) & 0x80) {
        let v = (M[0x2755 + y] + 1) & 0xFF;
        if (v === 0x3B) v = 0x01; else if (v === 0x1B) v = 0x20;
        M[0x2755 + y] = v;
      }
      if (B(Z.ctl_down) & 0x80) {
        let v = (M[0x2755 + y] - 1) & 0xFF;
        if (v === 0) v = 0x3A; else if (v === 0x1F) v = 0x1A;
        M[0x2755 + y] = v;
      }
      if (B(Z.ctl_left) & 0x80) {
        y = (y - 1) & 0xFF;
        if (y & 0x80) y = 0;
        M[Z.name_cursor] = y;
      }
      if (B(Z.ctl_right) & 0x80) {
        y = (y + 1) & 0xFF;
        if (y === 0x07) y = 0x06;
        M[Z.name_cursor] = y;
      }
    }
    first = false;
    for (let y = 6; y >= 0; y--) M[at(Z.row_ptr, y)] = M[0x2755 + y];   // j_271E
    P.colour_name_cursor();
    let x = M[Z.name_offset];
    for (let y = 0; y !== 0x07; y++) { M[(0x1A4D + x) & 0x3FFF] = M[0x2755 + y]; x = (x + 1) & 0xFF; }
    yield* wait(0x273D, 0x30);
  }
};
// The name's colours, white at the cursor (colour_name_cursor, $2743).
P.colour_name_cursor = function () {
  for (let y = 6; y >= 0; y--) M[at(Z.name_colour_cell, y)] = y === M[Z.name_cursor] ? 0x71 : 0x11;
};
// THE TYCOONS! and THE MENU, then the eight entries: each rank's number in a colour from TED's
// timer 1 (taken again while its low three bits are 0), the score with its leading 0s blank and
// the name in that colour (draw_hiscores, $2774).
P.draw_hiscores = function () {
  for (let x = 0x0B; x >= 0; x--) { M[0x0D94 + x] = M[0x275C + x] & 0x3F; M[0x0DA8 + x] = M[0x2768 + x] & 0x3F; }
  M[Z.row_ptr] = 0x0A; M[Z.colour_ptr] = 0x0A; M[Z.row_ptr + 1] = 0x0E; M[Z.colour_ptr + 1] = 0x0A;
  M[Z.rank_digit] = 0x01;
  let x = 0;
  do {
    let y = 0;
    M[Z.digit_seen] = 0;
    let a = io.read(0xFF00) & 0x07;
    while (a === 0) { P.N.spin++; a = io.read(0xFF00) & 0x07; }
    a |= 0x50;
    M[at(Z.colour_ptr, y)] = a;
    M[at(Z.row_ptr, y)] = M[Z.rank_digit] | 0x30;
    y++;
    M[at(Z.colour_ptr, y)] = a; M[Z.row_colour] = a;
    M[at(Z.row_ptr, y)] = 0x2E;
    y++;
    M[Z.count] = 0x05;
    do {                                                   // the score
      let d = M[0x1A4D + x];
      M[Z.item_work] = d;
      if (d !== 0x30) M[Z.digit_seen] = 0x01;
      else if (y !== 0x06 && M[Z.digit_seen] === 0) d = 0x20;
      M[at(Z.row_ptr, y)] = d;
      y++; x = (x + 1) & 0xFF;
      M[Z.count] = (M[Z.count] - 1) & 0xFF;
    } while (!(M[Z.count] & 0x80));
    M[at(Z.row_ptr, y)] = 0x2D;
    y++;
    M[Z.count] = 0x06;
    do {                                                   // the name
      M[at(Z.row_ptr, y)] = M[0x1A4D + x] & 0x3F;
      M[at(Z.colour_ptr, y)] = M[Z.row_colour];
      y++; x = (x + 1) & 0xFF;
      M[Z.count] = (M[Z.count] - 1) & 0xFF;
    } while (!(M[Z.count] & 0x80));
    step(Z.row_ptr, 0x28);
    M[Z.colour_ptr] = M[Z.row_ptr]; M[Z.colour_ptr + 1] = (M[Z.row_ptr + 1] - 0x04) & 0xFF;
    x = (x + 1) & 0xFF;
    M[Z.rank_digit] = (M[Z.rank_digit] + 1) & 0xFF;
  } while (M[Z.rank_digit] !== 0x09);
};
// The five items from menu_item down, each 14 characters in a colour of its own, the first on
// the menu's highlighted row (draw_menu, $2820).
P.draw_menu = function () {
  M[Z.item_work] = M[T.menu_item];
  M[Z.row_ptr] = 0x47; M[Z.colour_ptr] = 0x47; M[Z.row_ptr + 1] = 0x0E; M[Z.colour_ptr + 1] = 0x0A;
  M[Z.count] = 0x04;
  do {
    let x = (M[Z.item_work] << 4) & 0xFF;
    for (let y = 0; y !== 0x0E; y++) {
      M[at(Z.row_ptr, y)] = M[0x2884 + x] & 0x3F;
      M[at(Z.colour_ptr, y)] = (M[Z.item_work] + 0x51) & 0xFF;
      x = (x + 1) & 0xFF;
    }
    let i = (M[Z.item_work] + 1) & 0xFF;
    if (i === 0x05) i = 0;
    M[Z.item_work] = i;
    M[Z.work_ptr] = M[0x287F + M[Z.count]];
    step(Z.row_ptr, M[Z.work_ptr]);
    M[Z.colour_ptr] = M[Z.row_ptr]; M[Z.colour_ptr + 1] = (M[Z.row_ptr + 1] - 0x04) & 0xFF;
    M[Z.count] = (M[Z.count] - 1) & 0xFF;
  } while (!(M[Z.count] & 0x80));
};
// Fire chooses the highlighted item; up and down turn the menu (menu_input, $28D4).
P.menu_input = function () {
  if (B(Z.ctl_fire) & 0x80) P.menu_choose();
  if (B(Z.ctl_up) & 0x80) {
    M[T.menu_item] = (M[T.menu_item] + 1) & 0xFF;
    if (M[T.menu_item] === 0x05) M[T.menu_item] = 0;
  }
  if (B(Z.ctl_down) & 0x80) {
    M[T.menu_item] = (M[T.menu_item] - 1) & 0xFF;
    if (M[T.menu_item] & 0x80) M[T.menu_item] = 0x04;
  }
  P.draw_menu();
};
// The item chosen: PLAY THE GAME; the lives, 1 to 6; the sound off or on; the difficulty, EASY,
// HARD or IMPOSSIBLE !; WATCH THE DEMO (menu_choose, $2ABD).
P.menu_choose = function () {
  const item = M[T.menu_item];
  if (item === 0x03) { M[Z.menu_done] = 0x01; return; }
  if (item === 0x01) {
    let v = (M[T.lives_setting] + 1) & 0xFF;
    if (v === 0x07) v = 0x01;
    M[T.lives_setting] = v;
    M[0x28A1] = v | 0x30;
    return;
  }
  if (item === 0x02) {
    M[T.sound_on] ^= 0x01;
    const s = M[T.sound_on];
    let x = (((s << 1) & 0xFF) + s + (s >> 7)) & 0xFF;     // ASL, ADC sound_on
    for (let y = 0; y !== 0x03; y++) { M[0x28AD + y] = M[0x2B35 + x]; x = (x + 1) & 0xFF; }
    return;
  }
  if (item === 0x00) {
    let y = M[T.difficulty] + 1;
    if (y === 0x03) y = 0;
    M[T.difficulty] = y;
    let x = M[0x2B62 + y];
    for (y = 0; M[0x2B3B + x] !== 0; y++, x = (x + 1) & 0xFF) M[0x2885 + y] = M[0x2B3B + x];
    return;
  }
  M[T.demo_mode] = 0x01; M[Z.menu_done] = 0x01;
};
// The menu's frame: the boxes round the high scores and the menu, the logo's row with its
// characters in place of the enemies', and the controls drawn by the joystick's and the
// keyboard's icon (draw_menu_frame, $2903).
P.draw_menu_frame = function () {
  for (let x = 0x0F; x >= 0; x--) {
    M[0x0D6A + x] = 0x58; M[0x0DBA + x] = 0x58; M[0x0D7E + x] = 0x58; M[0x0DCE + x] = 0x58;
    M[0x096A + x] = 0x1E; M[0x09BA + x] = 0x1E; M[0x097E + x] = 0x1E; M[0x09CE + x] = 0x1E;
    M[0x0E1E + x] = 0x59;
    M[0x0E6E + x] = 0x5A;
  }
  M[0x0E1E] = 0x20; M[0x0E2D] = 0x20; M[0x0E6E] = 0x20; M[0x0E7D] = 0x20;
  M[0x0D92] = 0x58; M[0x0DA1] = 0x58; M[0x0DA6] = 0x58; M[0x0DB5] = 0x58;
  M[0x0992] = 0x1E; M[0x09A1] = 0x1E; M[0x09A6] = 0x1E; M[0x09B5] = 0x1E;
  M[0x0E46] = 0x5B; M[0x0E55] = 0x5C;
  for (let x = 0x77; x >= 0; x--) { M[0x0C00 + x] = 0x58; M[0x0800 + x] = 0x19; }
  P.show_logo_chars();
  for (let x = 0; M[0x299B + x] !== 0; x++) { M[0x0C32 + x] = M[0x299B + x]; M[0x0832 + x] = 0x71; }
  for (let x = 0x0B; x >= 0; x--) {
    const y = M[0x29AF + x];
    M[0x0D7A + y] = M[0x29BB + x]; M[0x097A + y] = M[0x29C7 + x];
  }
};
// The enemies' 112 bytes of characters kept at $0560 and the logo's put in their place
// (show_logo_chars, $3B71).
P.show_logo_chars = function () {
  for (let x = 0x6F; x >= 0; x--) { M[0x0560 + x] = M[0x3EE8 + x]; M[0x3EE8 + x] = M[0x3B83 + x]; }
};
};
})(typeof window !== 'undefined' ? window : globalThis);
