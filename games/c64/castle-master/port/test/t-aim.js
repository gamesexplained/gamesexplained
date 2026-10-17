'use strict';
// Aiming, firing and using alone against the game's: the sight's mode and the cross-hair, the
// sight moved to its edges, shots and uses at sights all over the view (the frame waits let
// through on both sides), picking against each moment's drawn faces, and the lookups.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: [] }, o)).fails ? 1 : 0; };
const noWait = P => {
  const g = P.DISPATCH_AIM_FIRE_ACTIVATE;
  P.DISPATCH_AIM_FIRE_ACTIVATE = function* (r) { const it = g(r); let s; while (!(s = it.next()).done) { P.M[0x1063] = 0; yield s.value; } return s.value; };
};
const hooks = {};
for (const a of [0x634E, 0x63F3, 0x6449]) hooks[a] = c => { c.m[0x1063] = 0; };
const sight = (M, rnd) => {
  if (rnd(3)) { M[0x2465] = rnd(0x78); M[0x2466] = 1 + rnd(0x78); }
  else { M[0x2465] = [0, 0x77, 0x3B][rnd(3)]; M[0x2466] = [1, 0x78, 0x3D][rnd(3)]; }
};
t({ name: 'DISPATCH_AIM_FIRE_ACTIVATE', onPort: noWait, hooks, cases: 3000, setup: (M, c, rnd) => {
  if (rnd(2)) M[0x2467] = rnd(2) ? 0xFF : 0;
  if (rnd(3) === 0) M[0x246B] = rnd(2) ? 0xFF : 0;
  sight(M, rnd);
  if (rnd(4) === 0) M[0x2416] = 1 + rnd(16);
  return { a: [0x1E, 0x15, 0x16, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1B, 0x1B, 0x10][rnd(12)] };
} });
t({ name: 'PICK_RENDERED_OBJECT', cases: 4000, outs: ['x', 'y'], setup: (M, c, rnd) => { sight(M, rnd); } });
t({ name: 'FIND_OBJECT_BY_ID', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
  M[0x105C] = rnd(3) ? rnd(64) : rnd(256);
  return { a: rnd(2) ? 0 : rnd(3) ? 1 + rnd(M[0x9D00] + 2) : rnd(256) };
} });
t({ name: 'POSITION_ENABLE_AIM_SPRITES', outs: ['x', 'y'], setup: (M, c, rnd) => { sight(M, rnd); } });
t({ name: 'BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => { M[0x105E] = rnd(3) ? 0 : rnd(16); } });
t({ name: 'POSITION_ENABLE_VIC_SPRITE', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x1233] = rnd(2); return { a: rnd(3) ? rnd(8) : rnd(256) }; } });
t({ name: 'DISABLE_VIC_SPRITE', outs: ['a', 'x', 'y'] });
t({ name: 'REDRAW_CENTER_SIGHT_STATE' });
process.exitCode = f ? 1 : 0;
