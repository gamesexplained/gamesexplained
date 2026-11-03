'use strict';
// The computer's play (g-ai.js) checked against the game's own on the moments it calls each
// routine, and at random.
const { check, prefetch } = require('./check.js');
const outs = {
  computer_turn: [], clear_plan: [], computer_move_creature: [], at_target: ['zf'], computer_land: ['zf'], computer_maybe_land: [],
  look_at_creature: [], computer_load_creature: [], computer_combat_figures: [], weapon_range: ['de'], find_in_wizard_list: ['zf', 'hl'],
  find_in_list: ['zf', 'hl', 'a'], waypoint_square: ['de'], route_address: ['hl'], computer_choose_target: [], rank_neighbours: [],
  sort_neighbours: [], forget_trail: [], on_trail: ['zf'], remember_square: [], computer_try_steps: [], computer_decide_attack: ['zf'],
  computer_take_object: ['zf', 'cf'], note_enemy: [], computer_shoot: [], computer_find_prey: [], computer_take_off: [], computer_flee: [],
  computer_seek_object: [], computer_pick_up: [], computer_drink: [], computer_open_chest: [], computer_choose_weapon: [],
  computer_choose_vial: [], computer_eat: [], computer_cast: [], computer_try_spell: [], scenario_spell: [], computer_spell_done: [],
  computer_summon: [], add_to_wizard_list: [], computer_deliver: [], carries_type: ['zf'], lies_here: ['zf'], computer_brew: [],
  release_group: [], trip_square: [],
};
const R = Object.keys(outs);
const O = { per: 4, frames: 3000, states: 'ai-' };
prefetch(R, O);
let fails = 0;
for (const n of R) fails += check(Object.assign({ name: n, outs: outs[n], cases: n === 'computer_turn' ? 40 : 300, limit: n === 'computer_turn' ? 20000000 : 200000 }, O)).fails;
process.exitCode = fails ? 1 : 0;
