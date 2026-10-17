'use strict';
// The view's scrolls and drawers alone against the game's: as play calls them, then at any place
// in the map, at a whole and a half character, and every scroll step from wherever the leader
// stands.
const { check, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, o)).fails ? 1 : 0; };
const L = labels();
const at = name => entries(L.byName.get(name).a, -1, {});
// anywhere in the map: the view's column, row, pixel row and half
const anywhere = half => (c, rnd) => {
  c.M[0x9633] = rnd(256); c.M[0x9634] = rnd(256); c.M[0x9632] = rnd(8);
  if (half !== undefined) c.M[0x9631] = half;
};
for (const name of ['scroll_up', 'scroll_down', 'draw_left_column', 'draw_right_column', 'draw_top_row', 'draw_bottom_row',
  'draw_left_half_column', 'draw_right_half_column', 'shift_pixels_left', 'shift_pixels_right', 'move_buffer_up',
  'move_buffer_down', 'shift_buffer_left', 'shift_buffer_right']) t({ name });
const rows = at('draw_top_row').concat(at('draw_bottom_row'));
for (const name of ['draw_top_row', 'draw_bottom_row', 'draw_left_column', 'draw_right_column', 'draw_view'])
  t({ name, cases0: rows, setup: anywhere(0) });
for (const name of ['draw_top_row', 'draw_bottom_row', 'draw_left_half_column', 'draw_right_half_column'])
  t({ name, cases0: rows, setup: anywhere(1) });
// every scroll step from the follow_leader's states, with the leader on each slope and anywhere in
// the view, at any pixel row and either half
const steps = at('follow_leader').concat(at('scroll_up'), at('scroll_down'));
for (const name of ['scroll_0', 'scroll_1', 'scroll_2', 'scroll_3', 'scroll_4', 'scroll_5', 'scroll_6', 'scroll_7',
  'scroll_9', 'scroll_10', 'scroll_11', 'scroll_13', 'scroll_14', 'scroll_15', 'scroll_left', 'scroll_right'])
  t({ name, cases0: steps, cases: 120, setup: (c, rnd) => {
    c.M[0x9632] = rnd(8); c.M[0x9631] = rnd(2);
    c.M[0x8ECD] = rnd(6);
    c.M[0x8316] = rnd(256); c.M[0x8317] = rnd(2);
    c.regs.a = L.byName.get(name).a & 255;
  } });
process.exitCode = f ? 1 : 0;
