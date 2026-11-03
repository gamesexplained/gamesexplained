'use strict';
// The records and the small questions asked of them (g-records.js) checked against the game's own
// on the moments it calls them.
const { check, prefetch } = require('./check.js');
const outs = {
  owner_is_player: ['a', 'zf'], player_has_creature: ['zf', 'ix', 'iy'], is_flying: ['a', 'zf'], is_loose: ['zf'], terrain_under: ['a'],
  entry_position: ['d', 'e'], read_table_word: ['h', 'l', 'd', 'e'], entry_column: ['a'], reset_ff86: [],
  value_against_best_at: ['a', 'cf', 'zf'], value_against_best: ['a', 'cf', 'zf'], cursor_on_selected: ['zf'], carry_limit: ['a', 'iy'],
  selected_potion: ['a', 'iy'], damage_and_rider: [], object_record_of: ['iy'], object_record: ['iy'], divide: ['a', 'c'],
  entry_address: ['h', 'l'], creature_record_of: ['iy'], creature_record: ['iy'], type_record_of: ['iy'], type_record: ['iy'],
  keep_figures: [], free_entry: ['zf', 'ix'], free_entry_after_wizards: ['zf', 'ix'], wizard_record: ['h', 'l'], wizard_record_0: ['h', 'l'],
};
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300 }).fails;
const divAny = (c, rnd) => { c.regs.a = rnd(256); c.regs.b = rnd(8) ? rnd(256) : 0; };
fails += check({ name: 'divide', outs: ['a', 'c'], from: 'entry_address', setup: divAny, cases: 300, seed: 3 }).fails;
process.exitCode = fails ? 1 : 0;
