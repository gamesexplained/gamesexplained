'use strict';
// The select menu's actions, END TURN, a turn's upkeep and a creature's damage (g-actions.js,
// g-turn.js) checked against the game's own on the moments it calls them.
const { check, prefetch } = require('./check.js');
const outs = {
  drop: [], change: [], pick_up: [], carried_weight: [], find_partner: ['zf'], ride: [], rider: [], pick_target: [],
  distance_from_selected: ['a'], distance: ['a'], use: [], use_square: [], set_terrain_under: [], can_drink: ['zf'], drink: [],
  can_fill: ['zf'], fill: [], can_eat: ['zf'], eat: [], end_turn: [], start_of_turn: [], load_creature: ['ix', 'iy'], damage_creature: [],
};
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300, limit: 2000 }).fails;
fails += check({ name: 'distance', from: 'move_cursor', outs: ['a'], setup: (c, rnd) => { c.regs.l = rnd(36); c.regs.h = rnd(36); c.regs.e = rnd(36); c.regs.d = rnd(36); }, cases: 300, seed: 11 }).fails;
process.exitCode = fails ? 1 : 0;
