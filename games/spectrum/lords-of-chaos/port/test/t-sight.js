'use strict';
// What a creature sees and its move (g-sight.js) checked against the game's own on the moments it
// calls them.
const { check, prefetch } = require('./check.js');
const outs = { update_view: [], work_out_sight: [], see_square: [], see_entry: [], count_enemy: [], trace_line_air: ['zf'],
  trace_line_ground: ['zf'], trace_line: ['zf'], move_selected: [], set_entry_square: [], move_carried: [], set_missile: [] };
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300 }).fails;
// from anywhere on the map, at either height
const anywhere = (c, rnd) => { c.regs.h = rnd(36); c.regs.l = rnd(36); c.M[0x5B2F] = rnd(2) ? 0xFE : 0xFF; c.M[0x8A89] = rnd(4) ? 0 : 1; };
fails += check({ name: 'work_out_sight', setup: anywhere, cases: 200, seed: 3 }).fails;
const traceAny = (c, rnd) => { for (const a of [0xFF88, 0xFF89, 0xFF4D, 0xFF4E]) c.M[a] = rnd(36); };
fails += check({ name: 'trace_line_ground', from: 'work_out_sight', setup: traceAny, outs: ['zf'], cases: 300, seed: 4 }).fails;
fails += check({ name: 'trace_line_air', from: 'work_out_sight', setup: traceAny, outs: ['zf'], cases: 300, seed: 5 }).fails;
process.exitCode = fails ? 1 : 0;
