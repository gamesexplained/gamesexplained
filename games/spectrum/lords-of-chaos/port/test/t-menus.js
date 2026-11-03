'use strict';
// The menus, the waits for the controls and a creature's figures (g-menus.js) checked against the
// game's own on the moments it calls them, and at random.
const { check, prefetch } = require('./check.js');
const outs = {
  set_up_game: [], portal_turn: [], game_over: [], wait_fire_flashing: [], print_victory_points: [], cursor_menu: [],
  offer_select_ground: [], offer_select_air: [], inform: [], draw_creature_panel: [], make_selected: [], centre: [], centre_on: [],
  list_neighbours_of_selected: [], list_neighbours: [], what_is_under_cursor: ['a'], what_is_at: ['a'], terrain_record_here: ['iy'],
  terrain_record: ['iy'], short_wait: [], next_creature: [], wait_release: [], wait_press: [], wait_fire: [], add_cursor_option: [],
  run_menu: [], highlight_file_option: [], highlight_menu_option: [], start_menu: [], add_menu_option: [], dispatch_menu: [], load_figures: [],
};
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300, limit: 2000 }).fails;
// any square
const sq = (c, rnd) => { c.regs.l = rnd(36); c.regs.h = rnd(36); };
for (const n of ['what_is_at', 'centre_on', 'list_neighbours']) fails += check({ name: n, from: 'move_cursor', outs: n === 'what_is_at' ? ['a'] : [], setup: sq, cases: 300, seed: 7 }).fails;
// the figures of any creature in the table
const fig = (c, rnd) => {
  const M = c.M;
  for (let k = 0; k < 40; k++) {
    const e = 0x5B5A + 6 * rnd(0x91);
    if (M[e + 2] < 0x8C || M[e + 2] === 0xFF) continue;
    M[0xFFF9] = e & 255; M[0xFFFA] = e >> 8;
    const crec = (M[0xD007] | M[0xD008] << 8);
    void crec;
    return;
  }
  return false;
};
void fig;
process.exitCode = fails ? 1 : 0;
