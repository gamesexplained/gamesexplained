'use strict';
// The hits' routines (src/g-hits.js), each checked alone against the game's (check.js), on the
// moments of play.
//   node t-hits.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 300), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
const pick = (rnd, a) => a[rnd(a.length)];
// a collision of Tal or sprite 2 with a creature of any kind, the state its tests read at their edges
function hit(M, c, rnd) {
  if (rnd(2)) M[0x70] = rnd(256);
  if (rnd(2)) M[0x6F] = rnd(8);
  const x = 3 + rnd(5);
  if (rnd(2)) {
    const k = rnd(6);
    M[0x0260 + x] = k === 0 ? M[0xFC54 + rnd(4)] : k === 1 ? pick(rnd, [0xC6, 0xD3, 0xC0, 0xC1, 0xDB]) :
      k === 2 ? M[0xC608 + rnd(16)] : k === 3 ? M[0xC618 + rnd(25)] : rnd(256);
    M[0x70] |= 0x80 >> (7 - x);
  }
  if (!rnd(3)) { const a = pick(rnd, [0x88, 0x8A, 0x8C, 0x84, 0xB2, 0xA6, 0xA8]); M[0x0260] = a; M[0x0261] = a + 1; }
  for (const a of [0x0290, 0x02A8, 0x0290 + x, 0x02A8 + x, 0x8A, 0x7B, 0x067E, 0x067F, 0x0680, 0xA7, 0xB0, 0x6E, 0x7C])
    if (!rnd(3)) M[a] = rnd(2) ? 0x80 : 0;
  if (!rnd(3)) M[0x0262] = pick(rnd, [0xBC, 0xBD, 0xBE, 0x00]);
  if (!rnd(3)) M[0x0280 + x] = rnd(4);
  if (!rnd(3)) M[0x93] = rnd(2) ? 0 : 5;
  if (!rnd(3)) M[0x40] = rnd(2) ? 0 : 5;
  if (!rnd(3)) M[0x5B] = rnd(2) ? 0 : 1 + rnd(60);
  if (!rnd(3)) M[0x46] = rnd(4);
  if (!rnd(3)) { M[0x51] = rnd(32); M[0x4F] = rnd(32); M[0x65] = rnd(40); }
  if (!rnd(3)) M[0x0260 + 2] = pick(rnd, [0xBC, 0xBE, 0xBF, 0xB8, 0x00]);
  if (!rnd(3)) { M[0x0260] = pick(rnd, [0xB8, 0xBA]); }
  c.vic[0x00] = M[0x0200]; c.vic[0x01] = M[0x0203]; c.vic[0x04] = M[0x0204]; c.vic[0x05] = M[0x0205];
  return {};
}
const T = ['throw_stone', 'scenery_hits', 'stone_cells', 'hazard_left', 'hazard_right', 'sprite_hits', 'tal_touches',
  'tal_damage', 'suit_damage', 'teleport_to_armour'].map(name => ({ name, setup: hit }));
T.push({ name: 'stone_cell', outs: ['a', 'x', 'y'], setup: hit });
T.push({ name: 'find_hit_slot', outs: ['a', 'x', 'c'], setup: hit });
T.push({ name: 'score_kill', outs: ['x'], setup: (M, c, rnd) => { hit(M, c, rnd); return { x: 3 + rnd(5) }; } });
T.push({ name: 'add_score', outs: ['a', 'x', 'c'], setup: (M, c, rnd) => { hit(M, c, rnd); if (rnd(2)) { M[0x0697] = 0xFF; M[0x0698] = rnd(2) ? 0xFF : 0; } return { a: rnd(256) }; } });
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
