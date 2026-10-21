'use strict';
// The HUD, the bars, the score, the big letters and the scene's colours and shapes, against the
// game's (lib.js).
const { check } = require('./lib.js');
const { Z, T } = globalThis.TexPort;
const digits = (M, rnd) => { for (let i = 0; i < 6; i++) M[0x0C56 + i] = 0x30 + rnd(10); };
check({ name: 'draw_hud', cases: 500, setup: (M, rnd) => { M[Z.keep_hud] = rnd(2); } });
check({ name: 'draw_pressure_bar', cases: 2000, setup: (M, rnd) => { M[Z.pressure_fine] = rnd(9); M[Z.pressure_cells] = [rnd(27), 0xFF][rnd(5) ? 0 : 1]; } });
check({ name: 'draw_completed_bar', cases: 2000, setup: (M, rnd) => { M[Z.completed_fine] = rnd(9); M[Z.completed_cells] = rnd(27); } });
check({ name: 'lose_pressure', cases: 3000, setup: (M, rnd) => {
  M[Z.pressure_fine] = rnd(8); M[Z.pressure_cells] = rnd(3) ? rnd(26) : rnd(2); M[Z.pressure_gone] = rnd(5) ? 0 : 1; return { a: 1 + rnd(4) };
} });
check({ name: 'add_completed', cases: 3000, setup: (M, rnd) => {
  M[Z.completed_fine] = rnd(8); M[Z.completed_cells] = rnd(27); if (rnd(4) === 0) M[T.completed_cells_full] = rnd(27); return { a: rnd(5) };
} });
check({ name: 'add_score_units', cases: 2000, setup: (M, rnd) => { digits(M, rnd); M[Z.lives] = rnd(10); M[Z.last_ten_thousands] = rnd(10); return { a: 1 + rnd(9) }; } });
check({ name: 'add_score', cases: 4000, setup: (M, rnd) => {
  digits(M, rnd); if (rnd(4) === 0) for (let i = 0; i < 6; i++) M[0x0C56 + i] = 0x39;
  M[Z.lives] = rnd(10); M[Z.last_ten_thousands] = rnd(10); return { a: 1 + rnd(9), y: rnd(6) };
} });
check({ name: 'countdown', cases: 6 });
check({ name: 'draw_big_glyph', cases: 1000, setup: (M, rnd) => {
  const g = 0x3399 + 2 * rnd(40), c = 0x0D40 + rnd(0x120);
  M[Z.glyph_ptr] = g & 0xFF; M[Z.glyph_ptr + 1] = g >> 8; M[Z.glyph_cell] = c & 0xFF; M[Z.glyph_cell + 1] = c >> 8; M[Z.glyph_colour] = rnd(256);
} });
check({ name: 'draw_big_glyph_2', cases: 300, setup: (M, rnd) => {
  const g = 0x3518 + 2 * rnd(10), c = 0x0D40 + rnd(0x120);
  M[Z.glyph_ptr] = g & 0xFF; M[Z.glyph_ptr + 1] = g >> 8; M[Z.glyph_cell] = c & 0xFF; M[Z.glyph_cell + 1] = c >> 8;
} });
check({ name: 'the_end', cases: 3 });
for (const name of ['bounce_the', 'bounce_end']) {
  check({ name, cases: 2000, setup: (M, rnd) => {
    for (const [cell, rows, down] of [['the_cell', 'the_rows', 'the_down'], ['end_cell', 'end_rows', 'end_down']]) {
      const c = 0x0D42 + 0x28 * rnd(6); M[Z[cell]] = c & 0xFF; M[Z[cell] + 1] = c >> 8; M[Z[rows]] = rnd(6); M[Z[down]] = rnd(2);
    }
  } });
}
check({ name: 'set_scene_colours', setup: (M, rnd) => { M[T.scene] = rnd(3); } });
check({ name: 'set_scene_graphics', setup: (M, rnd) => { M[T.scene] = rnd(3); } });
