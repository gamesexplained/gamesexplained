'use strict';
// Numbers printed, a hit shown, throwing, firing, terrain set alight and a wizard's death
// (g-combat.js) checked against the game's own on the moments it calls them, and at random.
const { check, prefetch } = require('./check.js');
const outs = {
  print_digit: ['a'], print_number: [], show_enemy_spotted: ['zf'], clear_map_things: [], show_hit: [], throw_air: [], throw_ground: [],
  throw_object: [], pick_throw_target: ['zf'], throw_range: ['a'], line_of_sight: ['zf'], line_between: ['zf'], fire_air: [], fire_ground: [],
  fire_missile: [], maybe_set_terrain: ['cf'], set_square_terrain: [], destroy_lost_objects: [], wizard_gone: [], entry_square: ['hl', 'a'],
  death_animation_frame: [], draw_death_figure: [], copy_wizard_name: [],
};
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300, limit: 2000 }).fails;
// a line between any two squares, the shooter and the target on the ground or in the air
const ends = (c, rnd) => {
  const M = c.M;
  M[0xFF88] = rnd(36); M[0xFF89] = rnd(36); M[0xFF4D] = rnd(36); M[0xFF4E] = rnd(36);
  M[0xFF31] = rnd(2) ? 0xFF : 0xFE; M[0x5B2F] = rnd(2) ? 0xFF : 0xFE;
};
fails += check({ name: 'line_between', from: 'move_cursor', outs: ['zf'], setup: ends, cases: 300, seed: 13 }).fails;
// any number printed
fails += check({ name: 'print_number', from: 'move_cursor', outs: [], setup: (c, rnd) => { c.regs.a = rnd(256); }, cases: 200, seed: 17 }).fails;
process.exitCode = fails ? 1 : 0;
