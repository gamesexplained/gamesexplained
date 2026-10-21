// The scrolling: the skyline (scroll_skyline, shift_skyline, feed_skyline, next_skyline_piece), the
// pipe and the pieces it is fed (scroll_pipe, shift_pipe, feed_pipe, next_pipe_piece, build_break,
// refill_pipe) and the message row (scroll_message); and the frame's small animations (Tex's legs,
// the star, the menu's frame and logo).
(function (root) {
'use strict';
(root.TexGroups = root.TexGroups || {}).scroll = function (P) {
const M = P.M, io = P.io, Z = P.Z, T = P.T, B = P.irqByte;

// The skyline's fine scroll moved on by skyline_speed, at half the rate at speed 1; a column's
// shift each time it passes 8 (scroll_skyline, $1D0D).
P.scroll_skyline = function () {
  if (M[Z.paused] !== 0) return;
  if (M[Z.speed] === 0x01) {
    M[Z.half_rate] = (M[Z.half_rate] + 1) & 0xFF;
    if ((M[Z.half_rate] & 0x01) === 0) return;
  }
  const v = (M[Z.skyline_scroll] - M[Z.skyline_speed]) & 0xFF;
  M[Z.skyline_scroll] = v & 0x07;
  if (v & 0x08) P.shift_skyline();
};
// The skyline's five rows ($0C78-$0D3F) a column left, and the new right column (shift_skyline, $1D31).
P.shift_skyline = function () {
  for (let x = 0; x !== 0x27; x++) {
    M[0x0C78 + x] = M[0x0C79 + x]; M[0x0CA0 + x] = M[0x0CA1 + x]; M[0x0CC8 + x] = M[0x0CC9 + x];
    M[0x0CF0 + x] = M[0x0CF1 + x]; M[0x0D18 + x] = M[0x0D19 + x];
  }
  P.feed_skyline({ c: 1 });                                // the carry from CPX #$27, equal
};
// The right column of the skyline, five characters on from skyline_char, a building every eight
// columns (feed_skyline, $1D86). The carry it is called with goes on into next_skyline_piece.
P.feed_skyline = function (r = {}) {
  M[Z.skyline_cols_left] = (M[Z.skyline_cols_left] - 1) & 0xFF;
  if (M[Z.skyline_cols_left] & 0x80) P.next_skyline_piece({ c: r.c });
  M[Z.skyline_cell] = 0x9F; M[Z.skyline_cell + 1] = 0x0C;
  for (let x = 4; x >= 0; x--) {
    M[(0x0C9F + M[0x19A6 + x]) & 0x3FFF] = M[Z.skyline_char];
    M[Z.skyline_char] = (M[Z.skyline_char] + 1) & 0xFF;
  }
};
// A building other than the last, one of eight, from a random byte picked by rnd2. The carry into
// random is the one it is called with (1, from shift_skyline's CPX #$27), then 1 from the CPX here
// (next_skyline_piece, $1DA4).
P.next_skyline_piece = function (r = {}) {
  let c = r.c;
  for (;;) {
    const i = B(Z.rnd2) & 0x03;
    P.random({ c });
    const x = B(Z.rnd0 + i) & 0x07;
    c = 1;
    if (x === M[Z.last_skyline]) continue;
    M[Z.last_skyline] = x;
    M[Z.skyline_char] = M[0x19AB + x];
    M[Z.skyline_cols_left] = 0x07;
    return;
  }
};

// The pipe's fine scroll moved on by pipe_speed; a column's shift each time it passes 8
// (scroll_pipe, $1D5A).
P.scroll_pipe = function () {
  if (M[Z.paused] !== 0) return;
  const v = (M[Z.pipe_scroll] - M[Z.pipe_speed]) & 0xFF;
  M[Z.pipe_scroll] = v & 0x07;
  if (v & 0x08) P.shift_pipe();
};
// The pipe's two rows ($0F70-$0FBF) a column left, and the new right column (shift_pipe, $1D6F).
P.shift_pipe = function () {
  for (let x = 0; x !== 0x27; x++) { M[0x0F70 + x] = M[0x0F71 + x]; M[0x0F98 + x] = M[0x0F99 + x]; }
  P.feed_pipe();
};
// The right column of the pipe from piece_buffer, two characters at a time, and the next piece
// when this one is used up (feed_pipe, $2602).
P.feed_pipe = function () {
  const x = M[Z.piece_index];
  M[0x0F97] = M[0x25E2 + x];
  M[0x0FBF] = M[0x25E1 + x];
  M[Z.piece_index] = (M[Z.piece_index] + 2) & 0xFF;
  if (M[Z.piece_index] === M[Z.piece_length]) P.next_pipe_piece();
};
// The next piece of pipe into piece_buffer (next_pipe_piece, $2513): a break every 18 pieces
// while rnd0's bit 7 is set (not while refilling); otherwise, in scenes 0 and 1, one of the scene's
// three pieces, of which the third is re-drawn from timer 1 (scene 0) or its high byte (scene 1)
// until it has come up nine times, and then one of the common pieces, of which the rare ones come
// only every so often (rare_counts against rare_limits). Scene 2 takes only common pieces.
P.next_pipe_piece = function () {
  if (M[Z.refilling] === 0 && (B(Z.rnd0) & 0x80)) {
    M[Z.break_timer] = (M[Z.break_timer] - 1) & 0xFF;
    if (M[Z.break_timer] === 0) { M[Z.break_timer] = 0x12; return P.build_break(); }
  }
  const scene = M[T.scene];
  if (scene === 0 || scene === 1) {
    M[Z.piece_pick] = P.random_byte().a & 0x03;
    let common = false;
    if (M[Z.piece_pick] === 0x03) {
      M[Z.roll3_count] = (M[Z.roll3_count] + 1) & 0xFF;
      if (M[Z.roll3_count] === 0x09) common = true;
      else M[Z.piece_pick] = io.read(scene === 0 ? 0xFF00 : 0xFF01) & 0x01;
    }
    if (!common) {
      const x = M[Z.piece_pick] << 1, table = scene === 0 ? 0x25C7 : 0x25CD;
      M[Z.piece_char] = M[table + x]; M[Z.piece_length] = M[table + 1 + x];
      return lay();
    }
  }
  M[Z.roll3_count] = 0;
  let a = P.random_byte().a & 0x03;
  if (a !== 0) {
    const x = a - 1;
    M[0x25DB + x] = (M[0x25DB + x] + 1) & 0xFF;
    if (M[0x25DB + x] === M[0x25DE + x]) { M[0x25DB + x] = 0; a = x + 1; } else a = 0;
  }
  const x = a << 1;
  M[Z.piece_char] = M[0x25D3 + x]; M[Z.piece_length] = M[0x25D4 + x];
  lay();
};
// j_25B4: piece_length characters counting up from piece_char, into piece_buffer
function lay() {
  let x = 0;
  do {
    M[(0x25E1 + x) & 0x3FFF] = M[Z.piece_char];
    M[Z.piece_char] = (M[Z.piece_char] + 1) & 0xFF;
    x = (x + 1) & 0xFF;
    P.N.piece++;
  } while (x !== M[Z.piece_length]);
  M[Z.piece_index] = 0;
}
// A break into piece_buffer (build_break, $308E): its left edge ($D6-$D9), one to three middles of
// four characters each, each one of three kinds by two random bits, and its right edge ($DD down
// to $DA). Only one middle until level 4 (break_parts 2); from then one to three.
P.build_break = function () {
  for (let x = 3, y = 0xD9; x >= 0; x--, y--) M[0x25E1 + x] = y;
  M[Z.piece_length] = B(Z.rnd1) & 0x01;
  let c;
  if (M[Z.break_parts] === 0x02) c = 1;                   // the carry from CMP #$02, equal
  else { M[Z.piece_length] = ((B(Z.rnd3) & 0x01) + M[Z.piece_length]) & 0xFF; c = 0; }
  let x = M[Z.piece_length];
  do {
    P.random({ c });
    M[Z.piece_index] = B(Z.rnd1) & 0x01;
    const s = (B(Z.rnd2) & 0x01) + M[Z.piece_index];
    M[(0x3107 + x) & 0x3FFF] = ((s << 2) + 0xDE) & 0xFF;
    c = 0;                                                 // the carry from ADC #$DE
    x = (x - 1) & 0xFF;
  } while (!(x & 0x80));
  let y = 4;
  x = 0;
  do {
    M[Z.piece_char] = M[(0x3107 + x) & 0x3FFF];
    for (let k = 3; k >= 0; k--) {
      M[(0x25E1 + y) & 0x3FFF] = M[Z.piece_char];
      M[Z.piece_char] = (M[Z.piece_char] + 1) & 0xFF;
      y = (y + 1) & 0xFF;
    }
    x = (x + 1) & 0xFF;
    M[Z.piece_length] = (M[Z.piece_length] - 1) & 0xFF;
  } while (!(M[Z.piece_length] & 0x80));
  M[Z.piece_char] = 0xDD;
  for (let k = 3; k >= 0; k--) {
    M[(0x25E1 + y) & 0x3FFF] = M[Z.piece_char];
    M[Z.piece_char] = (M[Z.piece_char] - 1) & 0xFF;
    y = (y + 1) & 0xFF;
  }
  M[Z.piece_index] = 0;
  M[Z.piece_length] = y;
};
// The whole pipe laid again, 65 columns of new pieces with the interrupt held off, and no break
// among them (refill_pipe, $196E). It ends with CLI, which can let an interrupt in at once.
P.refill_pipe = function () {
  io.sei();
  P.next_pipe_piece();
  M[Z.refilling] = 0x01;
  for (let y = 0x40; y >= 0; y--) P.shift_pipe();
  M[Z.refilling] = 0;
  io.cli();
};

// The message row's fine scroll a pixel a frame, and the row a character left each time it passes
// 8, the next character of message_text at its right; $FF ends the text (scroll_message, $226A).
P.scroll_message = function () {
  if (M[Z.paused] !== 0) return;
  const v = (M[Z.message_scroll] - 0x01) & 0xFF;
  M[Z.message_scroll] = v & 0x07;
  if (!(v & 0x08)) return;
  for (let x = 0; x !== 0x27; x++) M[0x0FC0 + x] = M[0x0FC1 + x];
  M[Z.message_ptr] = (M[Z.message_ptr] + 1) & 0xFF;
  if (M[Z.message_ptr] === 0) M[Z.message_ptr + 1] = (M[Z.message_ptr + 1] + 1) & 0xFF;
  let ch;
  for (;;) {
    ch = M[(M[Z.message_ptr] | M[Z.message_ptr + 1] << 8) & 0x3FFF];
    if (ch !== 0xFF) break;
    M[Z.message_ptr] = 0xAA; M[Z.message_ptr + 1] = 0x22;
  }
  M[0x0FE7] = ch & 0x3F;
};

// Tex's legs, the next of four frames every leg_delay frames while he runs (animate_legs, $1EF2).
P.animate_legs = function () {
  if (M[Z.paused] !== 0) return;
  if (M[Z.legs_still] !== 0) return;
  if (M[Z.speed] === 0) return;
  M[Z.leg_timer] = (M[Z.leg_timer] - 1) & 0xFF;
  if (M[Z.leg_timer] !== 0) return;
  M[Z.leg_timer] = M[Z.leg_delay];
  P.N.legs++;
  let x = (M[Z.leg_frame] + 1) & 0xFF;
  if (x === 0x04) x = 0;
  M[Z.leg_frame] = x;
  let y = M[0x19B7 + M[0x19B3 + x]];
  for (x = 0; x !== 0x30; x++) { M[0x3E48 + x] = M[0x1F2C + y]; y = (y + 1) & 0xFF; }
};
// The star in the sky, the next of six frames (twinkle_star, $2C68).
P.twinkle_star = function () {
  let y = (M[Z.star_step] + 1) & 0xFF;
  if (y === 0x06) y = 0;
  M[Z.star_step] = y;
  let x = M[0x2C85 + y];
  for (y = 0; y !== 0x08; y++) { M[0x3D50 + y] = M[0x2C8B + x]; x = (x + 1) & 0xFF; }
};

// The menu's animation, a frame at a time (menu_tick, $2CAB).
P.menu_tick = function () { P.cycle_logo_colours(); P.animate_menu_chars(); };
// The logo's colours stepped every 20 frames, black skipped, while the logo is up
// (cycle_logo_colours, $2CB2).
P.cycle_logo_colours = function () {
  if (M[0x0C32] !== 0x5D) return;
  M[Z.logo_timer] = (M[Z.logo_timer] + 1) & 0xFF;
  if (M[Z.logo_timer] !== 0x14) return;
  M[Z.logo_timer] = 0;
  P.N.logo++;
  for (let x = 0x13; x >= 0; x--) {
    let v;
    do { M[0x0832 + x] = (M[0x0832 + x] + 1) & 0xFF; v = M[0x0832 + x]; } while ((v & 0x07) === 0);
    M[0x0832 + x] = v & 0x77;
  }
};
// The menu frame's characters rolled every other frame: two scrolled down a line, one up, two
// rotated a pixel each way, and the lettering strip at $3DE2 rotated a pixel left
// (animate_menu_chars, $2BEE).
P.animate_menu_chars = function () {
  M[Z.menu_anim_timer] = (M[Z.menu_anim_timer] - 1) & 0xFF;
  if (M[Z.menu_anim_timer] !== 0) return;
  M[Z.menu_anim_timer] = 0x02;
  P.N.chars++;
  const a = M[0x3EC7], b = M[0x3ECF];
  for (let x = 6; x >= 0; x--) { M[0x3EC1 + x] = M[0x3EC0 + x]; M[0x3EC9 + x] = M[0x3EC8 + x]; }
  M[0x3EC8] = b; M[0x3EC0] = a;
  const c = M[0x3ED0];
  for (let x = 0; x !== 0x07; x++) M[0x3ED0 + x] = M[0x3ED1 + x];
  M[0x3ED7] = c;
  for (let x = 7; x >= 0; x--) {
    let v = M[0x3ED8 + x];
    M[0x3ED8 + x] = v >> 1;
    if (v & 1) M[0x3ED8 + x] = (v >> 1) | 0x80;
    v = M[0x3EE0 + x];
    M[0x3EE0 + x] = (v << 1) & 0xFF;
    if (v & 0x80) M[0x3EE0 + x] = ((v << 1) & 0xFF) | 0x01;
  }
  for (let x = 3; x >= 0; x--) {
    let k = M[0x3DFA + x] >> 7;
    M[0x3DFA + x] = (M[0x3DFA + x] << 1) & 0xFF;
    for (const base of [0x3DF2, 0x3DEA, 0x3DE2]) { const v = M[base + x]; M[base + x] = (v << 1 | k) & 0xFF; k = v >> 7; }
    if (k) M[0x3DFA + x] = 0x01 | M[0x3DFA + x];
  }
};
};
})(typeof window !== 'undefined' ? window : globalThis);
