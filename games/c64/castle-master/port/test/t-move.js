'use strict';
// Moving and looking alone against the game's: every action, in each movement mode and at each
// strength, facing and pitch (the level-view's frame waits are let through on both sides).
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 2000, outs: [] }, o)).fails ? 1 : 0; };
const ACTS = [3, 3, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 1, 2, 14, 20];
const noWait = P => {
  const g = P.DISPATCH_PLAYER_MOVEMENT;
  P.DISPATCH_PLAYER_MOVEMENT = function* (r) { const it = g(r); let s; while (!(s = it.next()).done) { P.M[0x1063] = 0; yield s.value; } return s.value; };
};
t({ name: 'DISPATCH_PLAYER_MOVEMENT', onPort: noWait, hooks: { 0x60C3: c => { c.m[0x1063] = 0; } }, setup: (M, c, rnd) => {
  if (rnd(2)) M[0x2455] = rnd(20);
  if (rnd(2)) M[0x2456] = rnd(3);
  if (rnd(4) === 0) M[0x1380] = rnd(2);
  if (rnd(2)) M[0x2410] = rnd(3) ? rnd(0x48) : 0;
  if (rnd(2)) M[0x2411] = rnd(0x48);
  return { a: ACTS[rnd(ACTS.length)] };
} });
t({ name: 'PRESENT_ACTION_FEEDBACK', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => ({ y: rnd(11) }) });
process.exitCode = f ? 1 : 0;
