'use strict';
// Select mode and the select menu (g-select.js) checked against the game's own on the moments it
// calls them, and the rescaling of action points at random.
const { check, prefetch } = require('./check.js');
const outs = {
  select_air: [], select_ground: [], update_info_panel: [], cursor_to_step: [], show_message: [], end_move: [], select_menu: [],
  spend_action_points: ['a'], can_fly_or_land: [], land: [], fly: [], ratio_divisor: ['b', 'c'], scale_by_ratio: ['e'],
  choose_from_list: [], draw_choice_bar: [], colour_choice_row: [],
};
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300, limit: 2000 }).fails;
fails += check({ name: 'ratio_divisor', from: 'move_cursor', outs: ['b', 'c'], setup: (c, rnd) => { c.regs.a = rnd(256); c.regs.b = rnd(256); }, cases: 300, seed: 8 }).fails;
fails += check({ name: 'scale_by_ratio', from: 'move_cursor', outs: ['e'], setup: (c, rnd) => { c.regs.h = 0; c.regs.l = rnd(256); c.regs.b = rnd(4); c.regs.c = rnd(256); }, cases: 300, seed: 9 }).fails;
fails += check({ name: 'colour_choice_row', from: 'move_cursor', setup: (c, rnd) => { c.regs.a = rnd(256); c.regs.b = rnd(11); }, cases: 100, seed: 10 }).fails;
process.exitCode = fails ? 1 : 0;
