'use strict';
// Collision alone against the game's: steps from where the player stands in every direction and
// length (short walks, long runs into walls, drops and climbs, flying), the crush test with moved
// objects, the drop to the floor, the fall's damage, and the scans the solver is made of.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: ['x'] }, o)).fails ? 1 : 0; };
const w = (M, a) => M[a] | M[a + 1] << 8;
const setw = (M, a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
const step = (M, rnd, far) => {
  const span = far ? 0x1400 : 0x300;
  for (const i of [0, 4]) setw(M, 0x104C + i, w(M, 0x2407 + i) + (rnd(3) ? rnd(span) - (span >> 1) : 0));
  setw(M, 0x104E, w(M, 0x2409) + (rnd(3) ? 0 : rnd(0x300) - 0x180));
  if (rnd(10) === 0) M[0x2418] = 1;
  if (rnd(30) === 0) M[0x1048] = 0;
  if (rnd(30) === 0) M[0x104D] = [0x7F, 0x9F][rnd(2)];
};
t({ name: 'SOLVE_PLAYER_COLLISION', cases: 3000, setup: (M, c, rnd) => { step(M, rnd, false); } });
t({ name: 'SOLVE_PLAYER_COLLISION', cases: 3000, setup: (M, c, rnd) => { step(M, rnd, true); } });
// a step into the side of one of the area's objects, its top a little above the feet (the
// climb), and steps from high in the air (the drop and its damage)
const into = (M, rnd) => {
  let p = w(M, 0x242B);
  for (let i = rnd(M[0x242A]); i > 0; i--) p += M[p + 8];
  const axis = rnd(2) ? 0 : 4, other = 4 - axis;
  const lo = M[p + 1 + axis / 2] * 64, size = M[p + 4 + axis / 2] * 64;
  const olo = M[p + 3 - axis / 2] * 64, osize = M[p + 6 - axis / 2] * 64;
  const top = (M[p + 2] + M[p + 5]) * 64, side = rnd(2);
  const at = side ? lo - 13 - rnd(40) : lo + size + 13 + rnd(40);
  setw(M, 0x2407 + axis, at); setw(M, 0x2407 + other, olo + rnd(osize + 1));
  setw(M, 0x2409, Math.max(0, top - rnd(M[0x2415] * 64 + 64)));
  for (let i = 0; i < 6; i++) M[0x104C + i] = M[0x2407 + i];
  setw(M, 0x104C + axis, at + (side ? 1 : -1) * (20 + rnd(200)));
  if (rnd(3) === 0) setw(M, 0x104C + other, w(M, 0x2407 + other) + rnd(200) - 100);
};
t({ name: 'SOLVE_PLAYER_COLLISION', cases: 3000, setup: (M, c, rnd) => { into(M, rnd); } });
t({ name: 'SOLVE_PLAYER_COLLISION', setup: (M, c, rnd) => {
  setw(M, 0x2409, w(M, 0x2409) + rnd(0x2000));
  for (let i = 0; i < 6; i++) M[0x104C + i] = M[0x2407 + i];
  for (const i of [0, 4]) setw(M, 0x104C + i, w(M, 0x2407 + i) + rnd(0x300) - 0x180);
} });
// moved objects: the flag set on a few, some of them about the player
t({ name: 'CHECK_NEWLY_VISIBLE_CRUSH', outs: ['c'], setup: (M, c, rnd) => {
  for (const [n, list] of [[0x242A, 0x242B], [0x1060, 0x1061]]) {
    let p = w(M, list);
    for (let i = 0; i < M[n]; i++) {
      if (rnd(4) === 0) {
        M[p] |= 0x10;
        if (rnd(3) === 0) { M[p + 1] = (w(M, 0x2407) >> 6) - rnd(4); M[p + 3] = (w(M, 0x240B) >> 6) - rnd(4); M[p + 2] = (w(M, 0x2409) >> 6) - rnd(8); }
      }
      p += M[p + 8] || 9;
    }
  }
} });
t({ name: 'DROP_PLAYER_TO_SUPPORT', outs: ['a'], setup: (M, c, rnd) => { setw(M, 0x2409, w(M, 0x2409) + rnd(rnd(2) ? 0x800 : 0x2000)); } });
t({ name: 'APPLY_FALL_DAMAGE', outs: ['a'], setup: (M, c, rnd) => { M[0x2455] = rnd(20); } });
t({ name: 'COMPUTE_MANHATTAN_DISTANCE_FROM_PLAYER', outs: ['a', 'x', 'c'], setup: (M, c, rnd) => {
  for (let i = 0; i < 6; i++) M[0x4F7E + i] = rnd(256);
  return { x: 0x7E, y: 0x4F };
} });
t({ name: 'FIND_NEAREST_SUPPORT_BELOW_POINT', outs: [], setup: (M, c, rnd) => {
  for (const i of [0, 4]) setw(M, 0x4F90 + i, w(M, 0x2407 + i) + rnd(0x400) - 0x200);
  setw(M, 0x4F92, w(M, 0x2409) + rnd(0x400) - 0x200);
} });
t({ name: 'SCAN_OBJECTS_FOR_COLLISION', outs: [], setup: (M, c, rnd) => {
  for (const i of [0, 4]) setw(M, 0x4F84 + i, w(M, 0x2407 + i) + rnd(0x400) - 0x200);
  setw(M, 0x4F86, w(M, 0x2409) + rnd(0x400) - 0x200);
  M[0x4F97] = rnd(256); M[0x4F98] = rnd(4);
} });
process.exitCode = f ? 1 : 0;
