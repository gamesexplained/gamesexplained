// The HUD: its text and colours (draw_hud), the two bars (draw_pressure_bar, lose_pressure,
// draw_completed_bar, add_completed), the score and the lives it gives (add_score_units,
// add_score); the big letters of the countdown and of THE END (countdown, draw_big_glyph, the_end,
// bounce_the, bounce_end, draw_big_glyph_2); and the scene's colours and enemy shapes
// (set_scene_colours, set_scene_graphics).
(function (root) {
'use strict';
(root.TexGroups = root.TexGroups || {}).hud = function (P) {
const M = P.M, Z = P.Z, T = P.T, B = P.irqByte;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;
const step = (z, d) => {
  const s = M[z] + d;
  M[z] = s & 0xFF;
  M[z + 1] = (M[z + 1] + (s > 0xFF ? 1 : s < 0 ? -1 : 0)) & 0xFF;
};
function* wait(a, x) { yield { cp: a }; yield* P.delay({ x }); yield { cp: a + 3 }; }

// The HUD's three rows from hud_text and hud_colours (unless keep_hud), the colours of the pipe's
// and message's rows and of the skyline's five, the bars' end characters and the high score
// (draw_hud, $1BD2).
P.draw_hud = function () {
  for (let x = 0; x !== 0x78; x++) {
    if (M[Z.keep_hud] === 0) { M[0x0C00 + x] = M[0x1C1D + x] & 0x3F; M[0x0800 + x] = M[0x1C95 + x]; }
    M[0x0B70 + x] = x < 0x50 ? M[Z.pipe_cell_colour] : M[Z.message_colour];
  }
  for (let x = 0; x !== 0xC8; x++) M[0x0878 + x] = M[Z.skyline_cell_colour];
  M[0x0C0C] = 0x53; M[0x0C34] = 0x53;
  M[0x0C27] = 0x54; M[0x0C4F] = 0x54;
  for (let x = 5; x >= 0; x--) M[0x0C72 + x] = M[0x1A4D + x];
};
// A bar of 26 cells at row, its fine part drawn into the character at part from bar_fill_patterns:
// full cells, then the part, then empty cells (the 'part' and 'empty' characters).
function bar(fine, cells, partChar, row, part, empty) {
  let x = (M[fine] << 3) & 0xFF;
  for (let y = 0; y !== 0x08; y++) { M[partChar + y] = M[0x21D1 + x]; x = (x + 1) & 0xFF; }
  let a = 0x4F;
  for (let y = 0; y !== 0x1A; y++) {
    if (!((y - M[cells]) & 0x80)) a = a === part ? empty : a === empty ? empty : part;   // CPY, BPL
    M[row + y] = a;
  }
}
// OIL PRESSURE (draw_pressure_bar, $217C).
P.draw_pressure_bar = function () { bar(Z.pressure_fine, Z.pressure_cells, 0x3E80, 0x0C0D, 0x50, 0x51); };
// % COMPLETED (draw_completed_bar, $2219).
P.draw_completed_bar = function () { bar(Z.completed_fine, Z.completed_cells, 0x3EB0, 0x0C35, 0x56, 0x51); };
// The pressure down by A eighths of a cell; pressure_gone once the last cell is used up
// (lose_pressure, $21B1).
P.lose_pressure = function (r) {
  M[Z.pressure_loss] = r.a;
  if (B(Z.pressure_gone) !== 0) return;
  const d = (M[Z.pressure_fine] - M[Z.pressure_loss]) & 0xFF;
  M[Z.pressure_fine] = d;
  if (!(d & 0x80)) return;
  M[Z.pressure_cells] = (M[Z.pressure_cells] - 1) & 0xFF;
  if (M[Z.pressure_cells] & 0x80) { M[Z.pressure_gone] = 0x01; M[Z.pressure_fine] = 0; }
  else M[Z.pressure_fine] = 0x07;
};
// % COMPLETED up by A eighths of a cell; level_done once the cells reach the operand of the CMP at
// $2254, 26 (add_completed, $224E).
P.add_completed = function (r) {
  const y = (r.a + M[Z.completed_fine]) & 0xFF;
  if (M[Z.completed_cells] === M[T.completed_cells_full]) { M[Z.level_done] = 0x01; return; }
  M[Z.completed_fine] = y & 0x07;
  if (y & 0x08) M[Z.completed_cells] = (M[Z.completed_cells] + 1) & 0xFF;
};
// A points to the score's units (add_score_units, $3245).
P.add_score_units = function (r) { return P.add_score({ a: r.a, y: 0x05 }); };
// A points to the score's digit Y, 0 the highest, as screen codes at $0C56-$0C5B, carrying up; a
// carry out of the top digit goes on into $0D55 (Y wraps to $FF). A life more, up to 9, each time
// the ten-thousands digit changes (add_score, $3247).
P.add_score = function (r) {
  M[Z.score_add] = r.a;
  let a = M[Z.score_add], y = r.y;
  for (;;) {
    a = (a + M[0x0C56 + y]) & 0xFF;
    if ((a - 0x3A) & 0x80) break;                            // CMP #$3A, BMI
    a = (a - 0x0A) & 0xFF;
    M[0x0C56 + y] = a;
    a = 0x01;
    y = (y - 1) & 0xFF;
    if (y & 0x80) break;
  }
  M[0x0C56 + y] = a;
  const t = M[0x0C57] & 0x0F;
  if (t === M[Z.last_ten_thousands]) return;
  M[Z.last_ten_thousands] = t;
  if (M[Z.lives] === 0x09) return;
  M[Z.lives] = (M[Z.lives] + 1) & 0xFF;
  M[0x0C65] = (M[0x0C65] + 1) & 0xFF;
};

// 5, 4, 3, 2, 1 in big letters, one a delay of 256 turns each (countdown, $331A).
P.countdown = function* () {
  M[Z.glyph_ptr] = 0x99; M[Z.glyph_ptr + 1] = 0x33;
  M[Z.countdown_step] = 0;
  do {
    M[Z.glyph_cell] = 0xC5; M[Z.glyph_cell + 1] = 0x0D;
    M[Z.glyph_colour] = M[0x3346 + M[Z.countdown_step]];
    P.draw_big_glyph();
    yield* wait(0x333A, 0);
    M[Z.countdown_step] = (M[Z.countdown_step] + 1) & 0xFF;
  } while (M[Z.countdown_step] !== 0x05);
};
// A letter 16 cells wide and 9 rows high from glyph_ptr, two bytes a row, a set bit a block
// character ($7B), at glyph_cell in glyph_colour; glyph_ptr is left at the next letter
// (draw_big_glyph, $334B, and its copy draw_big_glyph_2, $34CA).
function bigGlyph() {
  M[Z.glyph_rows] = 0x08;
  do {
    M[Z.glyph_bits] = M[at(Z.glyph_ptr, 0)]; M[Z.zpa_D0] = M[at(Z.glyph_ptr, 1)];
    M[Z.glyph_colour_cell] = M[Z.glyph_cell]; M[Z.glyph_colour_cell + 1] = (M[Z.glyph_cell + 1] - 0x04) & 0xFF;
    for (let y = 0x0F; y >= 0; y--) {
      const b = M[Z.glyph_bits], d = M[Z.zpa_D0];
      M[Z.glyph_bits] = b >> 1; M[Z.zpa_D0] = d >> 1 | (b & 1) << 7;
      M[at(Z.glyph_cell, y)] = d & 1 ? 0x7B : 0x20;
      M[at(Z.glyph_colour_cell, y)] = M[Z.glyph_colour];
    }
    step(Z.glyph_cell, 0x28); step(Z.glyph_ptr, 0x02);
    M[Z.glyph_rows] = (M[Z.glyph_rows] - 1) & 0xFF;
  } while (!(M[Z.glyph_rows] & 0x80));
}
P.draw_big_glyph = function () { bigGlyph(); };
P.draw_big_glyph_2 = function () { bigGlyph(); };
// THE and END bouncing in big letters, 80 steps of a delay of 20 turns each (the_end, $33F3).
P.the_end = function* () {
  M[Z.the_down] = 0x01; M[Z.end_down] = 0; M[Z.the_rows] = 0;
  M[Z.the_cell] = 0x42; M[Z.the_cell + 1] = 0x0D;
  M[Z.end_cell] = 0xF6; M[Z.end_cell + 1] = 0x0D;
  M[Z.countdown_step] = 0x50;
  M[Z.end_rows] = 0x04;
  do {
    M[Z.glyph_ptr] = 0x18; M[Z.glyph_ptr + 1] = 0x35;
    M[Z.glyph_cell] = M[Z.the_cell]; M[Z.glyph_cell + 1] = M[Z.the_cell + 1];
    M[Z.glyph_colour] = M[0x3458 + M[Z.the_down]];
    P.draw_big_glyph_2();
    M[Z.glyph_ptr] = 0x2A; M[Z.glyph_ptr + 1] = 0x35;
    M[Z.glyph_cell] = M[Z.end_cell]; M[Z.glyph_cell + 1] = M[Z.end_cell + 1];
    M[Z.glyph_colour] = M[0x3458 + M[Z.end_down]];
    P.draw_big_glyph_2();
    yield* wait(0x344A, 0x14);
    P.bounce_the(); P.bounce_end();
    M[Z.countdown_step] = (M[Z.countdown_step] - 1) & 0xFF;
  } while (M[Z.countdown_step] !== 0);
};
// THE a row down or up, turning at its fifth row and its first (bounce_the, $345A).
P.bounce_the = function () { bounce(Z.the_cell, Z.the_rows, Z.the_down); };
// END the same (bounce_end, $3492).
P.bounce_end = function () { bounce(Z.end_cell, Z.end_rows, Z.end_down); };
function bounce(cell, rows, down) {
  if (M[down] !== 0) {
    step(cell, 0x28);
    M[rows] = (M[rows] + 1) & 0xFF;
    if (M[rows] === 0x05) M[down] ^= 0x01;
  } else {
    step(cell, -0x28);
    M[rows] = (M[rows] - 1) & 0xFF;
    if (M[rows] === 0) M[down] ^= 0x01;
  }
}

// The scene's 15 colours from its row of scene_colours (set_scene_colours, $2CDE).
P.set_scene_colours = function () {
  const x = (M[T.scene] << 4) & 0xFF;
  const to = [Z.pipe_colour1, Z.pipe_colour2, Z.pipe_cell_colour, Z.pipe_bg, Z.skyline_colour1, Z.skyline_colour2,
    Z.skyline_cell_colour, Z.skyline_bg, Z.field_colour1, Z.field_colour2, Z.field_bg, Z.tex_colour, Z.message_colour,
    0x3458, 0x3459];
  to.forEach((a, i) => { M[a] = M[0x2D34 + x + i]; });
};
// The scene's enemy shapes, six characters each of the arrow, the bouncy bomb and the explosive,
// into the character set; every enemy in colour $78 (set_scene_graphics, $36B6).
P.set_scene_graphics = function () {
  let x = M[0x19BB + M[T.scene]];
  for (let y = 0; y !== 0x30; y++) {
    M[0x3EE8 + y] = M[0x36F2 + x]; M[0x3F68 + y] = M[0x3782 + x]; M[0x3FA8 + y] = M[0x3812 + x];
    x = (x + 1) & 0xFF;
  }
  for (const z of [Z.bouncy_colour, Z.arrow_colour, Z.jet_bomb_colour, Z.jet_colour, Z.explosive_colour]) M[z] = 0x78;
};
};
})(typeof window !== 'undefined' ? window : globalThis);
