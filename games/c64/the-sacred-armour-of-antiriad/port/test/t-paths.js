'use strict';
// The sprites' paths (src/g-paths.js), each checked alone against the game's (check.js), on the
// moments of play.
//   node t-paths.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 300), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
const DELAY = [0x80, 0x80, 0, 1, 2, 3];
// slot X somewhere along its path: a step's frames running out, its delays at any turn, any command
function slot(M, rnd, x) {
  if (rnd(3)) M[0x02E0 + x] = rnd(3) ? rnd(3) : 0;
  if (rnd(2)) M[0x0300 + x] = DELAY[rnd(DELAY.length)];
  if (rnd(2)) M[0x0308 + x] = DELAY[rnd(DELAY.length)];
  if (!rnd(3)) M[0x02E8 + x] = rnd(6);
  if (!rnd(4)) M[0x0210] = rnd(256);
}
const T = [
  { name: 'run_paths', setup: (M, c, rnd) => { for (let x = 2; x < 8; x++) { slot(M, rnd, x); if (!rnd(4)) M[0x0290 + x] ^= 0x80; } return {}; } },
  { name: 'path_step', outs: ['x'], setup: (M, c, rnd) => { const x = 2 + rnd(6); slot(M, rnd, x); M[0x02D8 + x] |= 0x80; return { x }; } },
  { name: 'load_path_step', outs: ['x', 'y'], setup: (M, c, rnd) => { const x = 2 + rnd(6); slot(M, rnd, x); return { x, y: (M[0x02D0 + x] - 2 + (rnd(4) ? 0 : rnd(256))) & 255 }; } },
  { name: 'path_chase', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { const x = 2 + rnd(6); slot(M, rnd, x); if (rnd(3)) { M[0x0200 + 2 * x] = M[0x0200] + rnd(3) - 1; M[0x0201 + 2 * x] = M[0x0201] + 9 + rnd(3); } return { x }; } },
  { name: 'reset_slot_path', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => ({ x: rnd(8) }) },
];
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
