'use strict';
// The panel's numbers and meters alone against the game's: the score's add, decimal formatting, and
// the panel's refresh with keys picked up (new, held, out of range), strength rising and falling
// through the movement modes' thresholds, and the spirits' meter.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: ['a', 'x', 'y', 'c'] }, o)).fails ? 1 : 0; };
t({ name: 'ADD_SCORE_U24', setup: (M, c, rnd) => { for (let i = 0; i < 3; i++) M[0x2442 + i] = rnd(256); } });
t({ name: 'FORMAT_UNSIGNED_DECIMAL', setup: (M, c, rnd) => {
  for (let i = 0; i < 4; i++) M[0x121C + i] = rnd(256);
  if (rnd(2)) M[0x121F] = M[0x121E] = 0;
  M[0x1230] = 1 + rnd(8);
  return { a: 1 + rnd(4), y: [10, 10, 16, 2, 1 + rnd(40)][rnd(5)] };
} });
t({ name: 'REFRESH_HUD_STATS', setup: (M, c, rnd) => {
  M[0x105A] = rnd(2) ? 0 : rnd(256);
  M[0x2457] = rnd(3) ? 0 : rnd(10);
  for (let i = 0; i < M[0x2457]; i++) M[0x245A + i] = 1 + rnd(10);
  M[0x2458] = rnd(2) ? 0 : rnd(13);
  M[0x2439] = rnd(2) ? 0 : rnd(256); M[0x243A] = rnd(2) ? 0 : rnd(4);
  M[0x2455] = rnd(21); M[0x7027] = rnd(2) ? M[0x2455] : rnd(21);
  M[0x2456] = rnd(3);
  M[0x2454] = rnd(22);
  M[0x246A] = rnd(256); M[0x7026] = rnd(2) ? M[0x246A] : rnd(256);
  if (rnd(4) === 0) M[0x9D49] = 0;
} });
process.exitCode = f ? 1 : 0;
