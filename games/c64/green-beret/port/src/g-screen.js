// The screen: the playfield's scroll one character at a time (coarse_scroll) with each new map column
// drawn at the right edge (column_draw) and its mines (mines_place); a stage drawn from its first
// column (stage_draw); the animated characters, the mines the hero steps on or shoots; the status
// line (lives, score, hi score, the weapon's rounds); the pictures and texts of the title and the
// intermissions, with the captives, the map and the hero's walk along it; and the swaps of the
// stages' graphics (block_swap).
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.screen = function (P) {
  const M = P.M, B = P.B, io = P.io, N = root.GBNames;
  const { coarse_due, column_due, col_row, count, map_col, map_col_hi, col_temp, ptr, ptr_hi, ptr2, ptr2_hi,
    map_ptr, map_ptr_hi, col_ptrs, colour_ptrs, stage, anim_targets, anim_target, frame_counters,
    anim_frame_ends, anim_frames, stage_mine_first, stage_mine_end, mine_col_hi, mine_col_lo, mine_chars,
    shot_active, weapon, shot_y, shot_xu, shot_speed, y_save, y_save3, crater_chars, stage_mine_pair, hero_char,
    player_frozen, anim_restore, row_ptrs_init, draw_count, frame_flag, status_text, status_screen, lives,
    score, hi_score, points_due, joy, text_table, text_pages, text_dest, picture_table, picture_commands,
    pic_call, pic_colour, pic_hi, pic_run_char, swap_flags, swap_ports, swap_a_addrs, swap_b_addrs,
    swap_lengths, ammo, work, ammo_icons, ammo_colours, captive_shapes, enemy_top_shape, enemy_bot_shape,
    enemy_top_colour, enemy_bot_colour, enemy_top_y, enemy_bot_y, captive_x_lo, captive_x_hi, enemy_top_xlo,
    enemy_bot_xlo, enemy_top_xhi, enemy_bot_xhi, lane_ready, lane_type, player_xu, spr_xlo, spr_xhi, spr_y,
    hero_bot_y, captive_free_x, spr_shape, progress_columns, game_over_text } = N;
  // A pointer in zero page at zp plus X, as (zp,X) reads it
  const indX = (zp, x) => M[(zp + x) & 255] | M[(zp + x + 1) & 255] << 8;
  const wr = P.wr, rd = P.rd;

  // coarse_scroll ($356F): when a shift is due, rows 8-23 of the playfield one character left
  // (columns 1-39 to 0-38), with the colours of rows 12-23; a new column is then due.
  P.coarse_scroll = function () {
    if (!B(coarse_due)) return { a: 0 };
    P.count('scroll');
    for (let row = 8; row <= 23; row++) {
      const s = 0x4000 + row * 40, c = 0xD800 + row * 40;
      for (let y = 0; y < 0x27; y++) {
        M[s + y] = M[s + 1 + y];
        if (row >= 12) wr(c + y, rd(c + 1 + y));
      }
    }
    M[coarse_due] = (B(coarse_due) - 1) & 255;
    M[column_due] = (M[column_due] + 1) & 255;
    return { y: 0x27 };
  };
  // column_draw ($39FB): the next map column at the right edge: the map column on, the map's two
  // blocks at it (from $C000, a quarter of the column, two bytes a column pair), each the address of
  // a block of 8 by 8 characters at $A000 with its colours at $B000, of which the column's eight
  // are copied down the row pointers (col_ptrs and colour_ptrs, 16 rows); then its mine.
  P.column_draw = function () {
    if (!M[column_due]) return { a: 0 };
    P.count('column');
    let x = 0;
    M[column_due] = 0;
    M[col_row] = 7;
    M[count] = 1;
    M[map_col] = (M[map_col] + 1) & 255;
    if (!M[map_col]) M[map_col_hi] = (M[map_col_hi] + 1) & 255;
    M[col_temp] = M[map_col] & 7;
    const at = (M[map_col_hi] << 8 | M[map_col]) >> 2;
    M[ptr_hi] = M[map_col_hi] >> 2;
    M[map_ptr] = at & 0xFE;
    M[map_ptr_hi] = (M[ptr_hi] + 0xC0) & 255;
    for (;;) {
      const b = rd(P.ind(map_ptr, M[count]));
      M[ptr] = (b & 3) << 6;
      M[ptr2] = M[ptr];
      M[ptr_hi] = ((b >> 2) + 0xA0) & 255;
      M[ptr2_hi] = M[ptr_hi] | 0x10;
      let y;
      do {
        y = ((M[col_row] << 3) + M[col_temp]) & 255;
        wr(indX(col_ptrs, x), rd(P.ind(ptr, y)));
        wr(indX(colour_ptrs, x), rd(P.ind(ptr2, y)));
        x += 2;
        if (y >= 8) M[col_row] = (M[col_row] - 1) & 255;
      } while (y >= 8);
      M[col_row] = 7;
      if (x >= 0x20) return P.mines_place();
      M[count] = (M[count] - 1) & 255;
    }
  };
  // mines_place ($3AA8): a mine of the stage's (stage_mine_first to stage_mine_end) at this column
  // put on the bottom row at the edge, its left or right half, in light grey.
  P.mines_place = function () {
    const y = M[stage];
    let x = M[stage_mine_first + y];
    do {
      P.count('mine_test');
      if (M[map_col_hi] === M[mine_col_hi + x] && M[map_col] === M[mine_col_lo + x]) {
        const a = ((x & 1) + M[mine_chars + y]) & 255;
        wr(indX(col_ptrs, 0x1E), a);
        wr(indX(colour_ptrs, 0x1E), 0x0F);
        return { a: 0x0F, x: 0x1E, y };
      }
      x = (x + 1) & 255;
    } while (x < M[stage_mine_end + y]);
    return { a: x, x, y };
  };
  // chars_animate ($3A7F): the stage's two animated characters (16 bytes at anim_targets, through
  // the STA's operand at $3AA1) from one of the two frames of anim_frames, by bit 2 of the frame
  // counter.
  P.chars_animate = function () {
    const ys = (M[stage] << 1) & 255;
    M[anim_target] = M[anim_targets + ys];
    M[anim_target + 1] = M[anim_targets + 1 + ys];
    const to = M[anim_target] | M[anim_target + 1] << 8;
    let y = M[anim_frame_ends + ((B(frame_counters) & 4) >> 2)];
    for (let x = 0x0F; x >= 0; x--, y = (y - 1) & 255) wr((to + x) & 0xFFFF, M[anim_frames + y]);
    return { x: 0xFF, y };
  };
  // shots_vs_mines ($3BC6): the hero's projectiles at Y $DE or below destroy a mine on the bottom row
  // under them; an exploding grenade (speed 0) every mine within six columns either side.
  P.shots_vs_mines = function () {
    for (let x = 2; x >= 0; x--) {
      if (!M[shot_active + x]) continue;
      if (M[shot_y + x] < 0xDE) continue;
      if (M[weapon] !== 3) {
        const y = ((M[shot_xu + x] - 0x0C) & 255) >> 2;
        const m = P.is_mine({ a: M[0x4398 + y], y });
        if (m.z) P.mine_destroy({ y: m.y });
        continue;
      }
      if (M[shot_speed + x]) continue;
      let y = (M[shot_xu + x] >> 2) - 6;
      if (y < 0) y = 0;
      M[y_save] = (y + 0x0C) & 255;
      for (;;) {
        const m = P.is_mine({ a: M[0x4398 + y], y });
        if (m.z) {
          // mine_destroy leaves a mine at column $26 or more where it is, and the game reads it again for ever
          if (m.y >= 0x26) throw new Error('shots_vs_mines: a mine past column $25, where the game loops for ever');
          y = P.mine_destroy({ y: m.y }).y;
          continue;
        }
        y = (y + 1) & 255;
        if (y >= M[y_save]) break;
      }
    }
    return { x: 0xFF };
  };
  // mine_destroy ($3C24): the stage's crater (crater_chars) in the mine's two columns of the bottom
  // row, from column Y when it is under $26.
  P.mine_destroy = function (r) {
    let y = r.y;
    M[y_save3] = y;
    const a = M[crater_chars + M[stage]];
    y = M[y_save3];
    if (y >= 0x26) return { a, y };
    M[0x4398 + y] = a; y++;
    M[0x4398 + y] = a; y++;
    return { a, y };
  };
  // is_mine ($3C3D): Z set when character A is one of the stage's two mine characters
  // (stage_mine_pair); for the right half Y one less, to the left half (not below 0).
  P.is_mine = function (r) {
    const a = r.a;
    let y = r.y;
    M[y_save3] = y;
    const k = (M[stage] << 1) & 255;
    if (a === M[stage_mine_pair + k]) return { a, y: M[y_save3], z: 1 };
    const z = a === M[stage_mine_pair + 1 + k] ? 1 : 0;
    y = M[y_save3];
    if (!z) return { a, y, z };
    if (y) y--;
    return { a, y, z: 1 };
  };
  // mine_check ($3C63): the hero steps on a mine when the character at his legs (hero_char) is one:
  // the sound off, the hero frozen, the explosion to its end, the death tune, and his life lost.
  P.CHECKPOINTS.push(0x3C76, 0x3C82);
  P.mine_check = function* () {
    const k = (M[stage] << 1) & 255, a = M[hero_char];
    if (a !== M[stage_mine_pair + k] && a !== M[stage_mine_pair + 1 + k]) return { a, y: k };
    yield* P.cp(0x3C76); P.sound_off();
    M[player_frozen] = (M[player_frozen] + 1) & 255;
    P.sfx_explode();
    yield* P.wait_tune();
    yield* P.cp(0x3C82); P.tune_start({ y: 0x29 });
    throw P.jump('lose_life');
  };
  // anim_chars_restore ($3C94): the three blocks of anim_restore back into the character sets at
  // $79F0, $DA90 and $D640, with the I/O out ($01 = $30) and the interrupt held off.
  P.anim_chars_restore = function () {
    const i = P.iflag();
    P.sei();
    M[1] = 0x30;
    for (let y = 0x0F; y >= 0; y--) {
      M[0x79F0 + y] = M[anim_restore + y];
      M[0xDA90 + y] = M[anim_restore + 0x10 + y];
      M[0xD640 + y] = M[anim_restore + 0x20 + y];
    }
    M[1] = 0x35;
    if (!i) P.cli();
    return { a: 0x35, y: 0xFF };
  };
  // prison_setup ($3CB7): the Prison Camp's second block of anim_restore at $7A90.
  P.prison_setup = function () {
    for (let y = 0x0F; y >= 0; y--) M[0x7A90 + y] = M[anim_restore + 0x10 + y];
    return { y: 0xFF };
  };
  // stage_draw ($3CC3): a stage from its map column: the row pointers one column before the left
  // edge, the hero frozen, the sprites off, the screen cleared and the status line drawn; then a
  // frame at a time a column is drawn (column_draw) and the pointers moved on, with a curtain of
  // characters ($21 in rows 3-7, $FB on the last) drawn left to right, until the screen is full; then
  // the status band's colours, the sprites on and the hero free.
  P.CHECKPOINTS.push(0x3CD8, 0x3CF5, 0x3CFD);
  P.stage_draw = function* () {
    M[player_frozen] = 0x3F;
    for (let x = 0x3F; x >= 0; x--) M[col_ptrs + x] = M[row_ptrs_init + x];
    M[draw_count] = 0;
    io.vicWrite(0x15, 0);
    yield* P.cp(0x3CD8);
    P.hero_chars(); P.screen_clear(); P.score_draw(); P.hi_score_check(); P.hi_score_draw();
    P.next_life_check(); P.lives_draw(); P.screen_toggle();
    M[frame_flag] = 0;
    let y;
    do {
      yield* P.cp(0x3CF5); yield* P.frame_wait();
      M[column_due] = 1;
      yield* P.cp(0x3CFD); P.column_draw();
      for (let x = 0x1E; x >= 0; x -= 2) {
        M[col_ptrs + x] = (M[col_ptrs + x] + 1) & 255;
        M[colour_ptrs + x] = (M[colour_ptrs + x] + 1) & 255;
        if (!M[colour_ptrs + x]) {
          M[col_ptrs + 1 + x] = (M[col_ptrs + 1 + x] + 1) & 255;
          M[colour_ptrs + 1 + x] = (M[colour_ptrs + 1 + x] + 1) & 255;
        }
      }
      M[draw_count] = (M[draw_count] + 1) & 255;
      y = (M[draw_count] - 1) & 255;
      for (const a of [0x4077, 0x409F, 0x40C7, 0x40EF, 0x4117]) M[a + y] = 0x21;
      M[0x43BF + y] = 0xFB;
    } while (y < 0x27);
    for (y = 0; y < 0xA0; y++) wr(0xD940 + y, 9);
    M[0x43E7] = 0xFB;
    M[column_due] = 1;
    io.vicWrite(0x15, 0xFF);
    M[player_frozen] = 0;
    return { a: 0, y };
  };
  // screen_clear ($3D56): rows 2-24 of the screen spaces, their colour 9, the first of them black.
  P.screen_clear = function () {
    for (let y = 0; y < 0xE6; y++) {
      M[0x4050 + y] = 0x20; M[0x4136 + y] = 0x20; M[0x421C + y] = 0x20; M[0x4302 + y] = 0x20;
      wr(0xD850 + y, y < 0x28 ? 0 : 9);
      wr(0xD936 + y, 9); wr(0xDA1C + y, 9); wr(0xDB02 + y, 9);
    }
    return { a: 0x20, y: 0xE6 };
  };
  // status_draw ($3632): the status line from status_text on the top row of the status band ($C400)
  // in white, the row below cleared, ten places of it in brown for the rounds, and the stage's
  // number. The BIT at $364B hides an LDA #$01 that the first 28 places take before their colour.
  P.status_draw = function () {
    let y = 0;
    for (let a; (a = M[status_text + y]) !== 0xFF; y = (y + 1) & 255) {
      M[status_screen + y] = a & 0x3F;
      if (y < 0x1C) { M[0xC428 + y] = 0x20; wr(0xD828 + y, 1); }
      else wr(0xD828 + y, 0x20);
      wr(0xD800 + y, 1);
    }
    for (y = 9; y >= 0; y--) wr(0xD829 + y, 9);
    M[0xC425] = (M[stage] + 0x31) & 255;
    return { a: M[0xC425], y: 0xFF };
  };
  // lives_draw ($C25F): the lives as a digit on the status line, a space for none (the LDA #$20
  // hidden in the BIT at $C267).
  P.lives_draw = function () {
    const a = M[lives] ? (M[lives] + 0x30) & 255 : 0x20;
    M[0xC408] = a;
    return { a };
  };
  // draw_game_over ($FD78): GAME OVER over LIVES on the status line ($C401), from game_over_text in
  // screen codes.
  P.draw_game_over = function () {
    for (let x = 9; x >= 0; x--) M[0xC401 + x] = M[game_over_text + x] & 0x3F;
    return { a: M[game_over_text] & 0x3F, x: 0xFF };
  };
  // score_draw ($C26E) and hi_score_draw ($C294): six decimal digits and a 0 after them.
  const digits = (from, to) => {
    let y = 0;
    for (let x = 2; x >= 0; x--) {
      const v = M[from + x];
      M[to + y++] = (v >> 4) + 0x30;
      M[to + y++] = (v & 15) + 0x30;
    }
    M[to + y] = 0x30;
    return { a: 0x30, x: 0xFF, y };
  };
  P.score_draw = () => digits(score, 0xC433);
  P.hi_score_draw = () => digits(hi_score, 0xC43D);
  // score_add ($C2BA): the points due added to the score in decimal, and cleared.
  P.score_add = function () {
    let c = 0;
    for (let k = 0; k < 3; k++) {
      const s = P.adcD(M[points_due + k], M[score + k], c);
      M[score + k] = s.v; c = s.c;
    }
    M[points_due] = 0; M[points_due + 1] = 0; M[points_due + 2] = 0;
    return { a: 0 };
  };
  // hi_score_check ($C2E4): a score above the hi score is copied over it.
  P.hi_score_check = function () {
    for (let x = 2; x >= 0; x--) {
      const a = M[score + x], h = M[hi_score + x];
      if (a < h) return { a, x };
      if (a !== h) {
        for (let k = 2; k >= 0; k--) M[hi_score + k] = M[score + k];
        return { x: 0xFF };
      }
    }
    return { x: 0xFF };
  };
  // draw_ammo ($FF9E): the weapon's rounds on the status line from $C429, an icon two characters
  // wide for each round left (ammo_icons, ammo_colours), the places after them blanked; with one
  // round left the icon already there is left as it is.
  P.draw_ammo = function () {
    if (!M[weapon]) return { a: 0 };
    const y = ((M[weapon] << 1) - 2) & 255;
    M[work] = ((M[ammo] - 1) << 1) & 255;
    let x = 8;
    while (x !== M[work]) {
      M[0xC429 + x] = 0x20; M[0xC42A + x] = 0x20;
      x -= 2;
      if (x < 0) return { a: 0x20, x: x & 255, y };
    }
    if (!M[work]) return { a: 0, x, y };
    let a;
    do {
      M[0xC429 + x] = M[ammo_icons + y];
      M[0xC42A + x] = M[ammo_icons + 1 + y];
      a = M[ammo_colours + y];
      wr(0xD829 + x, a); wr(0xD82A + x, a);
      x -= 2;
    } while (x >= 0);
    return { a, x: x & 255, y };
  };

  // title_wait ($C4FA): the title page: the credits (text 0), the screen on, the title tune ($35),
  // and frame by frame until fire is pressed; then the screen off.
  P.title_wait = function* () {
    M[frame_flag] = 0;
    yield* P.cp(0xC4FF); P.text_draw({ a: 0 });
    yield* P.cp(0xC502); P.screen_toggle();
    yield* P.cp(0xC507); P.tune_start({ y: 0x35 });
    do { yield* P.cp(0xC50A); yield* P.frame_wait(); } while (!(B(joy) & 0x10));
    return P.screen_toggle();
  };
  // text_draw ($C517): text A from text_table (its page moved on by text_pages for the stage), with
  // the I/O out: characters (their top two bits dropped) at the STA's operand at $C53C (text_dest),
  // which each marker byte sets from the two after it; $FF ends it.
  P.text_draw = function (r) {
    const k = (r.a << 1) & 255;
    let x = 0;
    const i = P.iflag();
    P.sei();
    M[1] = 0x30;
    M[ptr] = M[text_table + k];
    M[ptr_hi] = (M[text_table + 1 + k] + M[text_pages + M[stage]]) & 255;
    let y = 0;
    for (;;) {
      P.count('text');
      const a = M[P.ind(ptr, y)];
      if (!(a & 0x80)) {
        y = (y + 1) & 255;
        M[((M[text_dest] | M[text_dest + 1] << 8) + x) & 0xFFFF] = a & 0x3F;
        x = (x + 1) & 255;
        continue;
      }
      if (a === 0xFF) break;
      y = (y + 1) & 255; M[text_dest] = M[P.ind(ptr, y)];
      y = (y + 1) & 255; M[text_dest + 1] = M[P.ind(ptr, y)];
      x = 0;
      y = (y + 1) & 255;
    }
    M[1] = 0x35;
    if (!i) P.cli();
    return { a: 0x35, x, y };
  };
  // picture_draw ($CF32): picture A from picture_table onto the screen at $4000: bytes below $FB are
  // characters (pic_put); $FB a run, $FC an address, $FD a skip, $FE a colour, $FF the end, each
  // through the JSR at $CF64, whose operand (pic_call) it writes from picture_commands.
  const PIC = { 0xCF9F: 'pic_run', 0xCFB3: 'pic_address', 0xCFC8: 'pic_skip', 0xCFBE: 'pic_colour_set', 0xCFC5: 'end' };
  P.picture_draw = function (r) {
    const k = (r.a << 1) & 255;
    M[ptr2] = M[picture_table + k];
    M[ptr2_hi] = M[picture_table + 1 + k];
    M[ptr] = 0; M[ptr_hi] = 0x40;
    for (;;) {
      P.count('picture');
      const a = P.pic_read().a;
      if (a < 0xFB) { P.pic_put({ a }); continue; }
      P.count('picture_command');
      const x = ((a - 0xFB) << 1) & 255;
      M[pic_call] = M[picture_commands + x];
      M[pic_call + 1] = M[picture_commands + 1 + x];
      const at = M[pic_call] | M[pic_call + 1] << 8;
      if (!(at in PIC)) throw new Error('picture_draw: no command at $' + at.toString(16));
      if (PIC[at] === 'end') return { a: M[pic_call + 1], x };
      P[PIC[at]]();
    }
  };
  P.pic_read = function () {
    const a = rd(P.ind(ptr2, 0));
    M[ptr2] = (M[ptr2] + 1) & 255;
    if (!M[ptr2]) M[ptr2_hi] = (M[ptr2_hi] + 1) & 255;
    return { a, y: 0 };
  };
  // pic_put ($CF75): character A at the screen pointer and pic_colour at the same place in colour
  // RAM; the pointer on.
  P.pic_put = function (r) {
    wr(P.ind(ptr, 0), r.a);
    M[pic_hi] = M[ptr_hi];
    M[ptr_hi] = (M[ptr_hi] & 3) | 0xD8;
    wr(P.ind(ptr, 0), M[pic_colour]);
    M[ptr_hi] = M[pic_hi];
    M[ptr] = (M[ptr] + 1) & 255;
    if (!M[ptr]) M[ptr_hi] = (M[ptr_hi] + 1) & 255;
    return { a: M[pic_hi], y: 0 };
  };
  P.pic_run = function () {
    let x = P.pic_read().a;
    M[pic_run_char] = P.pic_read().a;
    do { P.count('run'); P.pic_put({ a: M[pic_run_char] }); x = (x - 1) & 255; } while (x);
    return { x: 0 };
  };
  P.pic_address = function () { M[ptr] = P.pic_read().a; M[ptr_hi] = P.pic_read().a; return { a: M[ptr_hi] }; };
  P.pic_colour_set = function () { M[pic_colour] = P.pic_read().a; return { a: M[pic_colour] }; };
  P.pic_skip = function () {
    const v = M[ptr2] + 0x14;
    M[ptr2] = v & 255;
    M[ptr2_hi] = (M[ptr2_hi] + (v > 255 ? 1 : 0)) & 255;
    return { a: M[ptr2_hi] };
  };
  // swaps_undo ($CFE1): every swapped block put back (block_swap for each flag set, 8 down to 0),
  // the interrupt flag as it was.
  P.swaps_undo = function () {
    const i = P.iflag();
    for (let y = 8; y >= 0; y--) if (M[swap_flags + y]) P.block_swap({ a: y });
    if (i) P.sei(); else P.cli();
    return { y: 0xFF };
  };
  // block_swap ($FEEC): block A swapped byte for byte with its partner (swap_a_addrs, swap_b_addrs,
  // swap_lengths) and its flag flipped, in its memory configuration (swap_ports, the operand at
  // $FF22; the interrupt held off for one with the I/O out); then $35 and the interrupt let in.
  P.block_swap = function (r) {
    const y0 = r.a;
    M[swap_flags + y0] ^= 1;
    M[0xFF22] = M[swap_ports + y0];
    if (M[0xFF22] !== 0x35) P.sei();
    let x = (y0 << 1) & 255;
    M[ptr] = M[swap_a_addrs + x]; M[ptr_hi] = M[swap_a_addrs + 1 + x];
    M[ptr2] = M[swap_b_addrs + x]; M[ptr2_hi] = M[swap_b_addrs + 1 + x];
    M[0xFF56] = M[swap_lengths + x];
    x = M[swap_lengths + 1 + x];
    M[1] = M[0xFF22];
    const swap = y => {
      P.count('swap');
      const a = P.ind(ptr, y), b = P.ind(ptr2, y);
      M[count] = rd(b);
      wr(b, rd(a));
      wr(a, M[count]);
    };
    for (;;) {
      for (let y = 0; y < 256; y++) swap(y);
      x = (x - 1) & 255;
      if (!x) break;
      M[ptr_hi] = (M[ptr_hi] + 1) & 255;
      M[ptr2_hi] = (M[ptr2_hi] + 1) & 255;
      if (!M[ptr2_hi]) break;
    }
    M[ptr_hi] = (M[ptr_hi] + 1) & 255;
    M[ptr2_hi] = (M[ptr2_hi] + 1) & 255;
    let y = 0;
    if (M[0xFF56]) do { swap(y); y = (y + 1) & 255; } while (y !== M[0xFF56]);
    M[1] = 0x35;
    P.cli();
    return { a: 0x35, x: 0, y };
  };

  // captives_place ($37B8): the four captives tied to their posts, enemy slots 0-3.
  P.captives_place = function () {
    for (let x = 3; x >= 0; x--) {
      M[enemy_top_shape + x] = M[captive_shapes + x];
      M[enemy_bot_shape + x] = 0xB5;
      M[enemy_top_colour + x] = 0x0B; M[enemy_bot_colour + x] = 0x09;
      M[enemy_top_y + x] = 0xA0; M[enemy_bot_y + x] = 0xB5;
      M[enemy_top_xlo + x] = M[captive_x_lo + x]; M[enemy_bot_xlo + x] = M[captive_x_lo + x];
      M[enemy_top_xhi + x] = M[captive_x_hi + x]; M[enemy_bot_xhi + x] = M[captive_x_hi + x];
    }
    return { x: 0xFF };
  };
  // guards_send ($37FE): lanes 2 and 5 ready with blue soldiers (type 3), brought in with their tops
  // at $C5 (spawn_on_floor's later part, j_2100).
  P.guards_send = function () {
    M[lane_ready + 2] = 1; M[lane_ready + 5] = 1;
    M[lane_type + 2] = 3; M[lane_type + 5] = 3;
    let f = P.lane_find_ready();
    do {
      const x = P.enemy_free_slot().x;
      P.j_2100({ a: 0xC5, x });
      f = P.lane_find_ready();
    } while (f.c);
    return f;
  };
  // captives_struggle ($381F): every 16 frames the captives' tops swap between their two frames.
  P.captives_struggle = function () {
    let y = (B(frame_counters) & 0x10) >> 2;
    for (let x = 3; x >= 0; x--) M[enemy_top_shape + x] = M[captive_shapes + y++];
    return { x: 0xFF, y };
  };
  // hero_walk_map ($3834): the intermission's hero along the map: right a unit a frame to $89, then
  // up the fence 3 lines a frame, in front, until his feet are above line $70, then behind the
  // background down the other side, a unit right and 3 lines down a frame, to $C0, where he comes in
  // front again and stops.
  const walkOn = a => {
    a = (a + 1) & 255;
    M[player_xu] = a;
    const p = (a << 1) & 255, c = a >> 7;
    M[spr_xlo] = p; M[spr_xlo + 1] = p;
    M[spr_xhi] = c; M[spr_xhi + 1] = c;
    return { a: c };
  };
  P.hero_walk_map = function () {
    const a = M[player_xu];
    if (a < 0x89) return walkOn(a);
    if (a >= 0x8A) {
      const t = B(spr_y);
      if (t >= 0xC0) { io.vicWrite(0x1B, 0); return { a: 0 }; }
      const s = t + 3;
      M[spr_y] = s & 255;
      M[hero_bot_y] = (s + 0x15 + (s > 255 ? 1 : 0)) & 255;
      return walkOn(M[player_xu]);
    }
    const t = (B(spr_y) - 3) & 255;
    M[y_save] = 0x0F;
    M[spr_y] = t;
    const b = (t + 0x15) & 255;
    M[hero_bot_y] = b;
    if (b >= 0x70) { io.vicWrite(0x1B, 0); return { a: 0, y: 0x0F }; }
    io.vicWrite(0x1B, 0xFF);
    M[y_save] = 9;
    return Object.assign({ y: 9 }, walkOn(M[player_xu]));
  };
  // rescue_walk ($3895): after the fourth stage the hero walks right past the captives, each freed
  // as he passes (captive_free_x); at $98 he stands (shapes $8A, $8B).
  P.rescue_walk = function () {
    const a = M[player_xu];
    if (a >= 0x98) {
      M[y_save] = 0;
      M[spr_shape] = 0x8A; M[spr_shape + 1] = 0x8B;
      return { a: 0x8B };
    }
    for (let x = 0; x < 4; x++) if (a >= M[captive_free_x + x]) { M[enemy_top_shape + x] = 0x8A; M[enemy_bot_shape + x] = 0x8B; }
    return Object.assign({ x: 4 }, walkOn(a));
  };
  // map_progress ($38CD): the map's progress line on the bottom row ($4398): the stages done filled
  // (progress_done), the one just done filling in a quarter at a time ($7A) with the frame counter,
  // the rest of it $75.
  P.map_progress = function () {
    P.progress_done();
    let y = M[progress_columns + ((M[stage] - 1) & 255)];
    let x = (B(frame_counters) >> 3) & 3;
    const n = x;
    for (; x; x--, y++) M[0x4398 + y] = 0x7A;
    return fill(n, y, 0x75);
  };
  function fill(x, y, a) {
    for (; x !== 3; x = (x + 1) & 255, y = (y + 1) & 255) M[0x4398 + y] = a;
    return { a, x, y };
  }
  // progress_fill ($38F3): from column Y with $7A until X reaches 3.
  P.progress_fill = r => fill(r.x, r.y, 0x7A);
  // progress_done ($3905): the three characters of every stage before this one filled with $7A.
  P.progress_done = function () {
    for (let x = M[stage]; x >= 1; ) {
      x--;
      fill(0, M[progress_columns + x], 0x7A);
    }
    return { x: 0 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
