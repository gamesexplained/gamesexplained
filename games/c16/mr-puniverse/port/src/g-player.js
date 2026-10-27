// The player: player_pass and player_move, the controls, the moves within his block and of the
// block, the crumbling floor, what he touches (switches, exits, vitamins), the pause; and his
// figure, drawn over the scenery behind it into six characters ($78-$7D), and the scenery's
// animation, which redraws it.
(function (root) {
'use strict';
(root.PuniGroups = root.PuniGroups || {}).player = function (P) {
const M = P.M, io = P.io, Z = P.Z, T = P.T, B = P.irqByte, POLL = P.POLL, N = P.N;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;
const bp = Z.block_ptr, u = T.under_player;
const left = () => (M[Z.player_x] & 0x10) === 0x10;
// j_25C5: PLA, PLA, JMP death; with Plus/4 World's RTS poked there (cheats.md), back to main_loop
const kill = () => (M[0x25C5] === 0x60 ? undefined : 'death');

// The player's pass (player_pass, $2581): D, the pause, the move; then what the middle cell of
// the column he stands in holds, and the bottom cell with player_y 3 or more. Returns 'death' or
// 'room_start' where the game leaves for them.
P.player_pass = function* () {
  if (B(Z.key_code) === 0x12) return 'death';
  yield* P.pause_check();
  if (P.player_move() === 'kill') return kill();
  if (!left()) { M[0x4B] = M[u + 1]; M[0x4C] = M[u + 2]; } else { M[0x4B] = M[u + 4]; M[0x4C] = M[u + 5]; }
  let a = M[0x4B];
  if (a >= 0xC1) {
    if (a < 0xC5) return P.leave_room({ a });
    if (a < 0xC8) return kill();
    if (a >= 0xCC && a < 0xD6) return kill();
  }
  if (M[Z.player_y] < 0x03) return;
  a = M[0x4C];
  if (a < 0xBD) return;
  if (a < 0xBF) { P.switch_off({ a }); return; }
  if (a < 0xC1) { P.switch_on({ a }); return; }
  if (a < 0xC5) return P.leave_room({ a });
  if (a < 0xC8) return kill();
  if (a < 0xCC) return;
  if (a < 0xD6) return kill();
  if (a !== 0xD7) return;
  return yield* P.collect_vitamin();
};

// The controls into $03 (read_input, $2543): port 2's stick, or X, Z, K and M and SHIFT.
P.read_input = function () {
  if (M[T.keyboard] === 0) {
    io.write(0xFF08, 0xFD);
    M[Z.controls] = io.read(0xFF08);
    return;
  }
  let x = 0x0F;
  const a = B(Z.key_code);
  if (a === 0x17) x = 0x07;
  if (a === 0x0C) x = 0x0B;
  if (a === 0x25) x = 0x0E;
  if (a === 0x24) x = 0x0D;
  M[Z.controls] = x;
  if (B(T.shift_flag) !== 0) return;
  M[Z.controls] = x | 0x80;
};

// A pass's move (player_move, $23E9): the fall, the ground under his feet, the jump, then left or
// right, and his characters rebuilt and drawn. Returns 'kill' on the deadly floor, where the game
// takes its return address and goes to j_25C5. Y is kept as the game's code leaves it on the way
// to move_left, whose SBC Plus/4 World's poke turns into an AND indexed by Y (cheats.md).
P.player_move = function () {
  P.read_input();
  let y = left() ? 0x79 : 0x78;
  M[0x4B] = M[at(bp, y)];
  let fall = false, ground = false;
  if (M[T.jumping] === 0x01) {
    if (M[T.jump_count] < 0x7F) {
      y = P.move_up({ y }).y;
      M[T.jump_count] = (M[T.jump_count] + 1) & 0xFF;
      io.write(0xFF0F, (io.read(0xFF0F) + 0x08) & 0xFF);
      if (M[T.jump_count] === 0x10) M[T.jump_count] = 0x80;
    } else {
      const r = P.move_down({ y });
      y = r.y;
      io.write(0xFF0F, (io.read(0xFF0F) - 0x08 - (1 - r.c)) & 0xFF);   // SBC #$08 on move_down's carry
      let end = P.is_solid({ a: M[0x4B] }).c === 1;
      if (!end) {
        const a = M[0x4B];
        if (a >= 0x80 && a < 0x88) end = true;
        else {
          M[T.jump_count] = (M[T.jump_count] + 1) & 0xFF;
          end = M[T.jump_count] === 0x90;
        }
      }
      if (end) { M[T.jumping] = 0; P.voice2_off(); }
    }
  } else if (M[Z.player_y] !== 0x06 && M[0x4B] !== 0xB5 && M[0x4B] !== 0xB6) {
    y = P.move_down({ y }).y;
  } else {
    const a = M[0x4B];
    if (a < 0x7E) ground = true;
    else if (a < 0x80) fall = true;
    else if (a < 0xA0) ground = true;
    else if (a < 0xA8) fall = true;
    else if (a < 0xB8) { y = P.crumble_step().y; ground = true; }
    else if (a < 0xBA) fall = true;
    else if (a < 0xBC) { y = P.move_left({ y }).y; ground = true; }
    else if (a < 0xBD) y = P.move_up({ y }).y;
    else if (a < 0xCA) fall = true;
    else if (a < 0xCC) return 'kill';
    else fall = true;
  }
  if (fall) {                                               // j_2472
    y = P.move_down({ y }).y;
    if ((io.read(0xFF11) & 0x20) !== 0x20) {
      P.voice2_on();
      io.write(0xFF0F, 0xC8);
      io.write(0xFF10, 0x03);
    }
    io.write(0xFF0F, (io.read(0xFF0F) - 0x08) & 0xFF);
  }
  if (ground) {                                             // j_24A3
    P.voice2_off();
    if ((M[Z.controls] & 0x80) !== 0x80) {
      M[T.jumping] = 0x01;
      M[T.jump_count] = 0;
      io.write(0xFF10, 0x03);
      io.write(0xFF0F, 0x64);
      P.voice2_on();
    }
  }
  if ((M[Z.controls] & 0x08) === 0) P.move_right();         // j_2525
  else if ((M[Z.controls] & 0x04) === 0) P.move_left({ y });
  P.copy_under_glyphs();
  P.merge_player();
  P.draw_player();
};

// A step right (move_right, $211A) and left (move_left, $2156) within the block, or the block a
// column on; a turn first if he faces the other way.
P.move_right = function () {
  if (left()) { P.shift_block_right(); M[Z.player_x] = 0; return; }
  M[Z.player_x] &= 0x0F;
  if (M[Z.player_x] !== 0x0C) { M[Z.player_x] = (M[Z.player_x] + 0x04) & 0xFF; return; }
  if (P.is_solid({ a: M[u + 4] }).c) return;
  if (P.is_solid({ a: M[u + 5] }).c) return;
  P.shift_block_right();
  M[Z.player_x] = 0;
};
P.move_left = function (r) {
  if (!left()) { const y = P.shift_block_left().y; M[Z.player_x] = 0x1C; return { y }; }
  M[Z.player_x] |= 0x10;
  if (M[Z.player_x] !== 0x10) {
    if (M[0x2172] === 0x39) M[Z.player_x] &= M[((M[0x2173] | M[0x2174] << 8) + r.y) & 0x3FFF];   // the poke's AND $04E9,Y
    else M[Z.player_x] = (M[Z.player_x] - 0x04) & 0xFF;
    return { y: r.y };
  }
  if (P.is_solid({ a: M[u + 1] }).c) return { y: r.y };
  if (P.is_solid({ a: M[u + 2] }).c) return { y: r.y };
  const y = P.shift_block_left().y;
  M[Z.player_x] = 0x1C;
  return { y };
};
// Two lines up (move_up, $2192), the block a row up below line 0 unless the cell above is solid.
P.move_up = function (r) {
  M[Z.player_y] = (M[Z.player_y] - 2) & 0xFF;
  if (M[Z.player_y] !== 0xFE) return { y: r.y };
  if (P.is_solid({ a: left() ? M[u + 3] : M[u] }).c) { M[Z.player_y] = 0; return { y: r.y }; }
  M[Z.player_y] = 0x06;
  M[at(bp, 0x50)] = M[u + 2]; M[at(bp, 0x51)] = M[u + 5];
  M[u + 2] = M[u + 1]; M[u + 1] = M[u]; M[u + 5] = M[u + 4]; M[u + 4] = M[u + 3];
  P.ptr_up({ x: bp });
  M[u] = M[at(bp, 0)]; M[u + 3] = M[at(bp, 1)];
  return { y: 0x01 };
};
// Two lines down (move_down, $21F4), the block a row down at line 8 unless the cell below is
// solid. Returns the carry the game's code leaves, which player_move's SBC takes.
P.move_down = function (r) {
  M[Z.player_y] = (M[Z.player_y] + 2) & 0xFF;
  if (M[Z.player_y] !== 0x08) return { c: M[Z.player_y] >= 0x08 ? 1 : 0, y: r.y };
  const y = left() ? 0x79 : 0x78;
  if (P.is_solid({ a: M[at(bp, y)] }).c) { M[Z.player_y] = 0x06; return { c: 1, y }; }
  M[Z.player_y] = 0;
  M[at(bp, 0)] = M[u]; M[at(bp, 1)] = M[u + 3];
  M[u] = M[u + 1]; M[u + 1] = M[u + 2]; M[u + 3] = M[u + 4]; M[u + 4] = M[u + 5];
  const c = P.ptr_down({ x: bp }).c;
  M[u + 2] = M[at(bp, 0x50)]; M[u + 5] = M[at(bp, 0x51)];
  return { c, y: 0x51 };
};
// The block a column right (shift_block_right, $2256) or left (shift_block_left, $229E).
P.shift_block_right = function () {
  M[at(bp, 0x00)] = M[u]; M[at(bp, 0x28)] = M[u + 1]; M[at(bp, 0x50)] = M[u + 2];
  M[u] = M[u + 3]; M[u + 1] = M[u + 4]; M[u + 2] = M[u + 5];
  M[u + 3] = M[at(bp, 0x02)]; M[u + 4] = M[at(bp, 0x2A)]; M[u + 5] = M[at(bp, 0x52)];
  P.ptr_right({ x: bp });
  M[Z.player_x] &= 0x0F;
  return { y: 0x52 };
};
P.shift_block_left = function () {
  P.ptr_left({ x: bp });
  M[at(bp, 0x02)] = M[u + 3]; M[at(bp, 0x2A)] = M[u + 4]; M[at(bp, 0x52)] = M[u + 5];
  M[u + 3] = M[u]; M[u + 4] = M[u + 1]; M[u + 5] = M[u + 2];
  M[u] = M[at(bp, 0x00)]; M[u + 1] = M[at(bp, 0x28)]; M[u + 2] = M[at(bp, 0x50)];
  M[Z.player_x] |= 0x10;
  return { y: 0x50 };
};
// Whether the character in A stops him (is_solid, $22E6): the carry.
P.is_solid = function (r) {
  const a = r.a;
  const c = a < 0x7E ? 1 : a < 0x88 ? 0 : a < 0xA0 ? 1 : a < 0xA8 ? 0 : a < 0xB8 ? 1 : a < 0xBA ? 0 :
    a < 0xBC ? 1 : a < 0xCA ? 0 : a < 0xCC ? 1 : 0;
  return { c };
};

// The crumbling floor a stage on under his feet (crumble_step, $23A5), drawn by crumble_redraw
// ($2317), or gone from $B8.
P.crumble_step = function () {
  M[0x4B] = (M[0x4B] + 2) & 0xFF;
  if (M[0x4B] < 0xB8) { M[0x4C] = 0x01; return P.crumble_redraw(); }
  const y = (M[0x4B] & 0x01) ? (left() ? 0x78 : 0x77) : (left() ? 0x79 : 0x78);
  M[at(bp, y)] = 0xD6; M[at(bp, y + 1)] = 0xD6;
  return { y: y + 1 };
};
P.crumble_redraw = function () {
  // the pair from its left half at offset y, its top half (below $B0) into the row above
  const j2356 = a => {
    if (a < 0xB0) { a = (a - 8) & 0xFF; M[u + 2] = a; a = (a + 1) & 0xFF; M[u + 5] = a; a = (a + 7) & 0xFF; }
    M[at(bp, 0x78)] = a; M[at(bp, 0x79)] = (a + M[0x4C]) & 0xFF;
    return { y: 0x79 };
  };
  if (M[0x4B] & 0x01) {
    let a = M[0x4B] = (M[0x4B] - 1) & 0xFF;
    if (left()) return j2356(a);
    if (a < 0xB0) { a = (a - 8) & 0xFF; M[at(bp, 0x4F)] = a; a = (a + 1) & 0xFF; M[u + 2] = a; a = (a + 7) & 0xFF; }
    M[at(bp, 0x77)] = a; M[at(bp, 0x78)] = (a + M[0x4C]) & 0xFF;
    return { y: 0x78 };
  }
  if (!left()) return j2356(M[0x4B]);
  let a = M[0x4B];
  if (a < 0xB0) { a = (a - 8) & 0xFF; M[u + 5] = a; a = (a + 1) & 0xFF; M[at(bp, 0x52)] = a; a = (a + 7) & 0xFF; }
  M[at(bp, 0x79)] = a; M[at(bp, 0x7A)] = (a + M[0x4C]) & 0xFF;
  return { y: 0x7A };
};

// The switches he touches (switch_off, $2614; switch_on, $262C), drawn by draw_switch_off ($2644)
// and draw_switch_on ($2667); the switch's number is the low three bits of a cell's colour.
P.switch_off = function (r) {
  if (r.a !== 0xBE) return;
  const y = P.draw_switch_off().y;
  P.colour_ptr({ x: bp });
  M[T.switch_state + (M[at(Z.colour_ptr_lo, y)] & 0x07)] = 0;
};
P.switch_on = function (r) {
  if (r.a !== 0xBF) return;
  const y = P.draw_switch_on().y;
  P.colour_ptr({ x: bp });
  M[T.switch_state + (M[at(Z.colour_ptr_lo, y)] & 0x07)] = 0x01;
};
P.draw_switch_off = function () {
  if (!left()) { M[at(bp, 0x4F)] = 0xBF; M[u + 2] = 0xC0; return { y: 0x50 }; }
  M[u + 2] = 0xBF; M[u + 5] = 0xC0;
  return { y: 0x50 };
};
P.draw_switch_on = function () {
  if (!left()) { M[u + 2] = 0xBD; M[u + 5] = 0xBE; return { y: 0x50 }; }
  M[u + 5] = 0xBD; M[at(bp, 0x52)] = 0xBE;
  return { y: 0x51 };
};

// An exit (leave_room, $2703): the room it leads to, the block moved to the far side, all kept
// for the player in play; then room_start.
P.leave_room = function (r) {
  const x = M[T.player], a = r.a;
  const move = d => {
    const t = (M[bp] | M[bp + 1] << 8) + d;
    M[bp] = t & 0xFF; M[bp + 1] = (t >> 8) & 0xFF;
  };
  if (a === 0xC1) {
    M[at(bp, 0x00)] = M[u]; M[at(bp, 0x01)] = M[u + 3]; M[at(bp, 0x28)] = M[u + 1]; M[at(bp, 0x29)] = M[u + 3];
    move(0x0258);
    M[T.room + x] = M[T.exit_up];
  } else if (a === 0xC2) { move(-0x0258); M[T.room + x] = M[T.exit_down]; }
  else if (a === 0xC3) { move(0x26); M[T.room + x] = M[T.exit_left]; }
  else { move(-0x26); M[T.room + x] = M[T.exit_right]; }
  M[T.saved_ptr_lo + x] = M[bp]; M[T.saved_ptr_hi + x] = M[bp + 1];
  M[T.saved_x + x] = M[Z.player_x]; M[T.saved_y + x] = M[Z.player_y];
  return 'room_start';
};

// P pauses (pause_check, $2798): PAUSED, the volume down, P let go, pressed and let go; the volume
// up and row 18 blanked.
P.pause_check = function* () {
  if (B(Z.key_code) !== 0x29) return;
  for (let x = 0; x < 6; x++) { M[0x0EE1 + x] = M[0x1B71 + x]; M[0x0AE1 + x] = 0x72; }
  io.write(0xFF11, io.read(0xFF11) & 0xF0);
  while (B(Z.key_code) !== 0x40) yield POLL;
  while (B(Z.key_code) !== 0x29) yield POLL;
  while (B(Z.key_code) !== 0x40) yield POLL;
  io.write(0xFF11, io.read(0xFF11) | 0x0F);
  for (let x = 0; x < 0x28; x++) M[0x0ED0 + x] = 0xD6;
};

// The room's vitamin taken (collect_vitamin, $27E0): gone from behind him, kept in vitamins_got,
// counted; the 25th (the CMP's operand at $281F) ends his game with the tune, after a key.
P.collect_vitamin = function* () {
  if (left()) M[u + 5] = 0xD6; else M[u + 2] = 0xD6;
  const x = M[T.vitamin_id];
  M[T.vitamins_got + x] |= M[T.player] === 0 ? 0x01 : 0x02;
  P.vitamin_count_up();
  const p = M[T.player];
  M[T.vitamin_count + p] = (M[T.vitamin_count + p] + 1) & 0xFF;
  if (M[T.vitamin_count + p] !== M[T.vitamins_to_win]) return;
  M[T.lives + M[T.player]] = 0x01;
  M[T.music_on] = 0x01;
  io.write(0xFF11, 0x01);
  while (B(Z.key_code) !== 0x40) yield POLL;
  while (B(Z.key_code) === 0x40) yield POLL;
  return 'death';
};

// Which of his characters the code in A is, as an index into under_player (player_cell, $1F4B).
P.player_cell = function (r) {
  const i = [0x78, 0x79, 0x7A, 0x7B, 0x7C].indexOf(r.a);
  return { y: i < 0 ? 5 : i };
};

// The six cells under his block into under_player (save_under_player, $1DDA).
P.save_under_player = function () {
  M[u] = M[at(bp, 0x00)]; M[u + 3] = M[at(bp, 0x01)];
  M[u + 1] = M[at(bp, 0x28)]; M[u + 4] = M[at(bp, 0x29)];
  M[u + 2] = M[at(bp, 0x50)]; M[u + 5] = M[at(bp, 0x51)];
};
// His six characters on the screen (draw_player, $1EEE).
P.draw_player = function () {
  M[at(bp, 0x00)] = 0x78; M[at(bp, 0x01)] = 0x7B;
  M[at(bp, 0x28)] = 0x79; M[at(bp, 0x29)] = 0x7C;
  M[at(bp, 0x50)] = 0x7A; M[at(bp, 0x51)] = 0x7D;
};
// The glyph's address of the character in $43, into $43/$44 (glyph_addr, $1E02).
P.glyph_addr = function () {
  M[0x44] = 0;
  for (let x = 0; x < 3; x++) {
    const t = M[0x43] << 1;
    M[0x43] = t & 0xFF;
    M[0x44] = ((M[0x44] << 1) | (t >> 8)) & 0xFF;
  }
  M[0x44] = (M[0x44] + 0x38) & 0xFF;
};
// The glyphs of the six characters behind him into the buffer at $3FD0 (copy_under_glyphs, $1E1E).
P.copy_under_glyphs = function () {
  M[0x49] = 0; M[0x4A] = 0;
  do {
    M[0x43] = M[u + M[0x4A]];
    P.glyph_addr();
    let x = M[0x49];
    for (let y = 0; y < 8; y++, x = (x + 1) & 0xFF) M[(T.glyph_buffer + x) & 0x3FFF] = M[at(0x43, y)];
    M[0x49] = x;
    M[0x4A] = (M[0x4A] + 1) & 0xFF;
  } while (M[0x4A] !== 0x06);
};
// His figure over the buffer, two bits a pixel, and the buffer into characters $78-$7D
// (merge_player, $1E48); a bit a call by shift_scenery_bit ($1ED6) and shift_figure_bit ($1EE2).
P.merge_player = function () {
  M[0x4E] = 0;
  M[0x49] = (M[Z.player_x] << 3) & 0xFF;
  let y = M[Z.player_y];
  M[0x4F] = 0;
  for (;;) {
    M[0x43] = M[(T.glyph_buffer + y) & 0x3FFF];
    M[0x44] = M[(T.player_frames + M[0x49]) & 0x3FFF];
    M[0x4A] = 0; M[0x4B] = 0; M[0x4C] = 0;
    for (let x = 0; x < 4; x++) {
      P.shift_scenery_bit(); P.shift_scenery_bit();
      P.shift_figure_bit(); P.shift_figure_bit();
      M[0x4A] = (M[0x4A] << 2) & 0xFF;
      if (M[0x4C] === 0) M[0x4A] = (M[0x4A] + M[0x4B]) & 0xFF;
      else { M[0x4A] = (M[0x4A] + M[0x4C]) & 0xFF; N.fig++; }
      M[0x4B] = 0; M[0x4C] = 0;
    }
    M[(T.glyph_buffer + y) & 0x3FFF] = M[0x4A];
    y = (y + 1) & 0xFF;
    M[0x49] = (M[0x49] + 1) & 0xFF;
    M[0x4F] = (M[0x4F] + 1) & 0xFF;
    if (M[0x4F] !== 0x10) continue;
    M[0x4E] = (M[0x4E] + 1) & 0xFF;
    if (M[0x4E] === 0x02) break;
    y = (M[Z.player_y] + 0x18) & 0xFF;
    M[0x4F] = 0;
  }
  M.copyWithin(T.player_chars, T.glyph_buffer, T.glyph_buffer + 0x30);
};
P.shift_scenery_bit = function () {
  const t = M[0x43] << 1;
  M[0x43] = t & 0xFF;
  M[0x4B] = ((M[0x4B] << 1) | (t >> 8)) & 0xFF;
};
P.shift_figure_bit = function () {
  const t = M[0x44] << 1;
  M[0x44] = t & 0xFF;
  M[0x4C] = ((M[0x4C] << 1) | (t >> 8)) & 0xFF;
};

// The scenery's animation (animate_chars, $1D13), a job a pass: the random cannon's head turned,
// the conveyor belts rolled a pixel, the lift and the force field scrolled up a line; each then
// rebuilds the player over what changed.
P.animate_chars = function () {
  M[T.anim_phase] = (M[T.anim_phase] + 1) & 0xFF;
  const ph = M[T.anim_phase];
  if (ph === 1) {
    const a = M.slice(0x3CC0, 0x3CC8), b = M.slice(0x3CE0, 0x3CE8);
    M.copyWithin(0x3CC0, 0x3CC8, 0x3CE0);
    M.copyWithin(0x3CE0, 0x3CE8, 0x3D00);
    M.set(b, 0x3CF8); M.set(a, 0x3CD8);
  } else if (ph === 2) {
    for (let x = 0; x < 8; x++) {
      for (let k = 0; k < 2; k++) {
        for (const [l, r] of [[0x3DC0, 0x3DC8], [0x3DD0, 0x3DD8]]) {
          const t = M[l + x] << 1, s = (M[r + x] << 1) | (t >> 8);
          M[r + x] = s & 0xFF;
          M[l + x] = (t & 0xFF) + (s >> 8);
        }
      }
    }
  } else if (ph === 3) {
    const a = M[0x3DE0], b = M[0x3E30], c = M[0x3E38];
    M.copyWithin(0x3DE0, 0x3DE1, 0x3DE8);
    M.copyWithin(0x3E30, 0x3E31, 0x3E38);
    M.copyWithin(0x3E38, 0x3E39, 0x3E40);
    M[0x3E3F] = c; M[0x3E37] = b; M[0x3DE7] = a;
    M[T.anim_phase] = 0;
  } else return;
  P.copy_under_glyphs();
  P.merge_player();
};
};
})(typeof window !== 'undefined' ? window : globalThis);
