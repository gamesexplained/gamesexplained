'use strict';
// The projection and the roll alone against the game's ($2458-$2808), on moments of play with the
// points' coordinates and the roll stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256), rnd(256)][rnd(12)];
const small = rnd => [0, 1, 0xFF, 0xFE, 2, 3, 0xFD, rnd(256)][rnd(8)];
const pt = (M, rnd) => {
  for (const a of [0x52, 0x51, 0x37, 0x33]) if (!rnd(2)) M[a] = byte(rnd);
  for (const a of [0x78, 0x77, 0x38, 0x69, 0x3E, 0x32, 0xA7, 0xA8, 0xAB, 0xAC]) if (!rnd(2)) M[a] = small(rnd);
  const x = rnd(0x40);
  if (!rnd(2)) { M[0x8040 + x] = byte(rnd); M[0xA330 + x] = small(rnd); }
  return x;
};
T('PROJECT_X', { setup: (M, c, rnd) => ({ x: pt(M, rnd) }), outs: ['x'] });
T('PROJECT_X_AT', { setup: (M, c, rnd) => { const x = pt(M, rnd); M[0x16] = x; return { x, a: byte(rnd) }; }, outs: ['x'] });
T('PROJECT_LOG', { setup: (M, c, rnd) => { const x = pt(M, rnd); M[0x16] = x; if (!rnd(2)) M[0x24F8] = 0xB0; return { x: rnd(256), y: rnd(16) }; }, outs: ['x'] });
T('PROJECT_Y', { setup: (M, c, rnd) => ({ x: pt(M, rnd) }), outs: ['x'] });
T('EXP', { setup: (M, c, rnd) => { M[0x14] = rnd(256); return { a: rnd(3) ? 0xE0 + rnd(32) : byte(rnd) }; }, outs: ['a'] });
T('ROLL_TABLES', { cases: 500, setup: (M, c, rnd) => {
  if (rnd(4)) { M[0x0126] = byte(rnd); M[0x0123] = rnd(256); }
  if (!rnd(4)) { M[0x2806] = M[0x0126]; M[0x2807] = M[0x0123] & 0xC0; }
} });
const roll = (M, rnd) => {
  const x = rnd(0x40);
  M[0xA200 + x] = rnd(256); M[0xA24C + x] = rnd(256);
  M[0xA298 + x] = rnd(2) ? 0 : small(rnd); M[0xA2E4 + x] = rnd(2) ? 0 : small(rnd);
  if (!rnd(3)) M[0xA330 + x] = byte(rnd);
  return x;
};
T('ROLL_POINT', { setup: (M, c, rnd) => ({ x: roll(M, rnd) }) });
T('ROLL_POINT_ON', { setup: (M, c, rnd) => ({ x: roll(M, rnd) }), outs: ['x'] });
T('ROLL_FAR', { setup: (M, c, rnd) => ({ x: roll(M, rnd) }), outs: ['x'] });
process.exitCode = f ? 1 : 0;
