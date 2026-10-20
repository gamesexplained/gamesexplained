'use strict';
// The level's routines, against the game's (lib.js).
const { check } = require('./lib.js');
const inMap = rnd => 0x38F8 + rnd(0x3FA6 - 0x38F8);
const at = (M, p) => { M[0x0D] = p & 0xFF; M[0x0E] = p >> 8; };
check({ name: 'random_below', cases: 3000, setup: (M, rnd) => ({ a: 1 + rnd(255), c: rnd(2) }), outs: ['a', 'c'] });
check({ name: 'find_space', cases: 2000, setup: (M, rnd) => ({ a: rnd(4), c: rnd(2) }), outs: ['a', 'x', 'y', 'c'] });
check({ name: 'put_square', setup: (M, rnd) => { at(M, inMap(rnd)); return { a: rnd(256) }; }, outs: ['a', 'y', 'c'] });
check({ name: 'put_wide', setup: (M, rnd) => { at(M, inMap(rnd)); return { a: rnd(256) }; }, outs: ['a', 'y', 'c'] });
check({ name: 'put_tall', setup: (M, rnd) => { at(M, inMap(rnd)); return { a: rnd(256) }; }, outs: ['a', 'y', 'c'] });
check({ name: 'place_goodies', cases: 500, setup: (M, rnd) => {
  // a mine of earth, as start_level leaves it before placing the goodies
  for (let row = 3; row < 23; row++) for (let col = 1; col < 89; col++) M[0x37EA + row * 0x5A + col] = 1 + (col & 1 ? 0 : 1) + (row & 1 ? 0 : 2);
  M[0xA7] = rnd(16); M[0xB1] = 1 + rnd(4); M[0xB2] = 1 + rnd(3); M[0xB3] = 1 + rnd(3); M[0xB4] = 1 + rnd(4);
  return { c: rnd(2) };
}, outs: ['a', 'c'] });
check({ name: 'release_creature', setup: (M, rnd) => { M[0x9D] = rnd(4); for (let i = 0; i < 4; i++) M[0x23 + i] = rnd(3) ? 1 : 0; } });
check({ name: 'dynamite', cases: 3000, setup: (M, rnd) => {
  M[0x9F] = rnd(3) ? rnd(0x17) : 0; M[0x0B] = rnd(2) ? 8 : 0; M[0x0C] = rnd(2) ? 8 : 0;
  // a few sticks, some about to go off
  const n = rnd(5);
  M[0x9E] = 3 * (n + 1);
  for (let i = 1; i <= n; i++) {
    const p = 0x38F8 + rnd(0x3FA6 - 0x38F8), k = 3 * i;
    M[0x0700 + k] = p & 0xFF; M[0x0701 + k] = p >> 8; M[0x0702 + k] = rnd(3) ? 1 + rnd(3) : 0;
    M[p] = [0x6F, 0xA2, 0x5C, 0x00][rnd(4)];
  }
  if (rnd(3) === 0) { M[0x0702] = 1; }
  const q = (M[0x2E] | M[0x2F] << 8) & 0x3FFF; if (rnd(2)) M[q] = 0;
} });
