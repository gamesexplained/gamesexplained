'use strict';
// Characters, pixels, missiles and lines (g-lines.js) checked against the game's own on the moments
// it calls them.
const { check, prefetch } = require('./check.js');
const R = ['print_char', 'pixel_line_address', 'bar_edge', 'bar_top', 'bar_fill_line', 'draw_bar_outlines', 'plot', 'draw_shape',
  'clear_tail', 'missile_step', 'wipe_tail', 'draw_missile', 'draw_hit', 'scroll_down', 'scroll_up', 'scroll_right', 'scroll_left',
  'print_char_small', 'print_char_big', 'line_setup', 'wrap_coordinate', 'line_step_pixels', 'line_step'];
prefetch(R, { per: 4 });
let fails = 0;
const outs = { pixel_line_address: ['h', 'l'], wrap_coordinate: ['a'] };
for (const n of R) fails += check({ name: n, outs: outs[n] || [], cases: 300 }).fails;
process.exitCode = fails ? 1 : 0;
// A missile from the selected creature's square to the cursor's, on moments of play: the sessions
// rarely fire one, so the squares, the speed, the tail and the shape are drawn at random.
const missile = (c, rnd) => {
  const M = c.M;
  M[0x5B55] = rnd(36); M[0x5B56] = rnd(36);
  M[0xD0D3] = (M[0x5B55] + rnd(15) - 7 + 36) % 36; M[0xD0D4] = (M[0x5B56] + rnd(15) - 7 + 36) % 36;
  M[0xFF5E] = 1 + rnd(8); M[0xFF5F] = 1 + rnd(8); M[0xFF5D] = rnd(2); M[0xFF61] = rnd(2) ? 0xFF : rnd(256);
};
fails += check({ name: 'draw_missile', from: 'line_setup', setup: missile, cases: 150, seed: 3 }).fails;
const tail = (c, rnd) => { missile(c, rnd); c.M[0xFF3B] = rnd(0xA8); c.M[0xFF3C] = rnd(0xA8); };
fails += check({ name: 'clear_tail', from: 'line_setup', setup: tail, cases: 60, seed: 4 }).fails;
const plotAny = (c, rnd) => { c.M[0xFF33] = rnd(192); c.M[0xFF34] = rnd(256); c.M[0xFF32] = rnd(3); c.M[0xFF61] = rnd(2) ? 0xFF : rnd(256); };
fails += check({ name: 'plot', setup: plotAny, cases: 300, seed: 5 }).fails;
const stepAny = (c, rnd) => { for (let a = 0xFF3B; a <= 0xFF48; a++) c.M[a] = rnd(256); c.M[0xFF3B] = rnd(36); c.M[0xFF3C] = rnd(36);
  for (const a of [0xFF3F, 0xFF40, 0xFF41, 0xFF42]) c.M[a] = [0, 1, 0xFF][rnd(3)]; };
fails += check({ name: 'line_step', from: 'line_setup', setup: stepAny, cases: 300, seed: 6 }).fails;
fails += check({ name: 'line_step_pixels', from: 'line_setup', setup: stepAny, cases: 300, seed: 7 }).fails;
const setupAny = (c, rnd) => { for (const a of [0xFF3B, 0xFF3C, 0xFF3D, 0xFF3E]) c.M[a] = rnd(36); };
fails += check({ name: 'line_setup', setup: setupAny, cases: 300, seed: 8 }).fails;
process.exitCode = fails ? 1 : 0;
