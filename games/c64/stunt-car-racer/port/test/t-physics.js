'use strict';
// The car's physics alone against the game's ($0897-$0F29), on random moments of play with the
// car's state stirred: speeds, angles at and past their limits, the road's heights under the
// three points, the springs, and the flags that pick the drag.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256), rnd(256)][rnd(12)];
const small = rnd => [0, 1, 0xFF, 0xFE, 2, 3, 0xFD, rnd(256)][rnd(8)];
const stir = (M, rnd, from, to, k = 4) => { for (let a = from; a <= to; a++) if (!rnd(k)) M[a] = rnd(2) ? byte(rnd) : small(rnd); };
// the flags the physics branches on
const flags = (M, rnd) => {
  for (const a of [0x6A, 0x2F, 0x0E, 0xE4, 0x6B, 0xC308, 0xC36A, 0xC373, 0xC359, 0xC77D]) if (!rnd(3)) M[a] = byte(rnd);
  if (!rnd(4)) M[0xC77D] = rnd(8);
  if (!rnd(4)) M[0xC359] = 0xE0;
};
const car = (M, c, rnd) => { stir(M, rnd, 0x0100, 0x018F); flags(M, rnd); };

T('WHEEL_OFFSETS', { setup: (M, c, rnd) => { stir(M, rnd, 0x0774, 0x07C3, 2); } });
T('MOVE_CAR', { setup: (M, c, rnd) => {
  car(M, c, rnd);
  for (const x of [0, 2]) if (!rnd(3)) { M[0x0124 + x] = [0x2C, 0x2D, 0x0A, 0x0B, 0xD3, 0xD2, 0xF5, 0xF4][rnd(8)]; }
  if (!rnd(3)) { M[0x0107] = rnd(5); M[0x0104] = [0xE7, 0xE8, 0xFF, rnd(256)][rnd(4)]; }
} });
T('ADD_FORCES', { setup: car }); T('ADD_SPIN', { setup: car });
T('WHEELS_ON_ROAD', { setup: (M, c, rnd) => {
  car(M, c, rnd); stir(M, rnd, 0xC340, 0xC34B, 2); stir(M, rnd, 0xC3CE, 0xC3D3, 2);
  for (const a of [0xC38B, 0xC35C, 0xE1, 0x209B]) if (!rnd(3)) M[a] = small(rnd);
  if (!rnd(2)) for (let x = 0; x < 3; x++) { M[0xC343 + x] = (M[0xC349 + x] + rnd(3)) & 255; M[0xC3CE + x] = M[0xC3D1 + x]; }
} });
T('SPRINGS', { setup: car }); T('SPIN_FORCES', { setup: car }); T('SIDE_GRIP', { setup: car });
T('ROAD_HOLD', { setup: car, outs: ['a'] });
T('DRAG', { setup: car });
T('WHEEL_LEVERS', { setup: (M, c, rnd) => { car(M, c, rnd); stir(M, rnd, 0xC3D4, 0xC3D6, 2); } });
T('COSINE_OF', { setup: (M, c, rnd) => { M[0x14] = byte(rnd); return { a: small(rnd) }; }, outs: ['a', 'x'] });
process.exitCode = f ? 1 : 0;
