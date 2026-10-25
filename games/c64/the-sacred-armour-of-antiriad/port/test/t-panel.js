'use strict';
// The panel's routines (src/g-panel.js), each checked alone against the game's (check.js), on the
// moments of play.
//   node t-panel.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 300), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
const T = [
  { name: 'colour_panel', setup: (M, c, rnd) => { M[0x89] = rnd(2) ? 0x80 : 0; M[0x87] = rnd(3) ? 0 : 1; M[0x0355] = rnd(3) ? rnd(256) : 0x8C; return {}; } },
  { name: 'update_energy_bars', setup: (M, c, rnd) => { M[0x8A] = rnd(4) ? 0x80 : 0; M[0x8F] = rnd(4) ? 0 : 1; M[0x4F] = rnd(33); M[0x50] = rnd(33); M[0x51] = rnd(32); M[0x52] = rnd(32); return {}; } },
  { name: 'step_suit_bar', outs: ['x'] },
  { name: 'step_tal_bar', outs: ['x'] },
  { name: 'energy_tick', setup: (M, c, rnd) => { M[0x91] = rnd(2) ? 0 : 1 + rnd(3); M[0x7B] = rnd(2) ? 0x80 : 0; M[0x51] = rnd(3) ? rnd(32) : 0x1F; M[0x5B] = rnd(2) ? 0 : 1 + rnd(9); M[0x4F] = rnd(34); M[0x75] = rnd(4); return {}; } },
];
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
