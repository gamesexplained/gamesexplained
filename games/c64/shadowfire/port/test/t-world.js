'use strict';
// The ship's routines (src/g-world.js), each checked alone against the game's (check.js), on the
// moments of play, at locations chosen at random.
//   node t-world.js [cases] [routine]
const { check } = require('./check.js');

const STACK = [[0x100, 0x1FF]];
const w = (M, a) => M[a] | M[a + 1] << 8;
const record = (M, n) => (n & 0x80 ? w(M, 0xB2E4 + ((n << 1) & 255)) : w(M, 0xB1E4 + ((n << 1) & 255)));
const CHECKS = [
  { name: 'build_directions', outs: ['a', 'x', 'y'], cases: 600, setup: (M, c, rnd) => { M[0x6DC6] = rnd(3) ? 0 : 1; return { a: rnd(0xA4) }; } },
  { name: 'draw_view_map', outs: ['a', 'x', 'y'], cases: 600, setup: (M, c, rnd) => {
    const p = record(M, rnd(0xA4));
    M[0x3F] = p & 255; M[0x40] = p >> 8;
    return rnd(10) ? { x: M[p], y: M[p + 1] } : { x: 0xFF, y: 0xFF };
  } },
  { name: 'find_view_locations', outs: ['a', 'x', 'y'], cases: 300, setup: (M, c, rnd) => {
    const p = record(M, rnd(0xA4));
    M[0x3F] = p & 255; M[0x40] = p >> 8;
  } },
  { name: 'shift_f7', outs: ['a', 'x'], setup: (M, c, rnd) => { M[0xF7] = rnd(256); return { x: rnd(8) }; } },
  { name: 'next_cell_row', outs: ['a'] },
  { name: 'unused_nibbles', outs: ['a'] },
];
if (require.main === module) {
  const cases = +(process.argv[2] || 2000), only = process.argv[3];
  let fails = 0;
  for (const o of CHECKS) {
    if (only && o.name !== only) continue;
    fails += check(Object.assign({ cases: Math.min(cases, o.cases || cases), ignore: STACK }, o)).fails;
  }
  process.exitCode = fails ? 1 : 0;
}
module.exports = { CHECKS };
