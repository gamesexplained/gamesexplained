'use strict';
// The main program's routines that do not wait, against the game's (lib.js).
const { check } = require('./lib.js');
const screen = rnd => 0x0C00 + rnd(0x3FE);
check({ name: 'print_level', setup: (M, rnd) => { M[0xA7] = rnd(16); const s = screen(rnd); return { a: s & 0xFF, x: s >> 8 }; },
  outs: ['a', 'x', 'y', 'c'] });
check({ name: 'print_bcd', setup: (M, rnd) => { const s = screen(rnd); M[0x0D] = s & 0xFF; M[0x0E] = s >> 8; return { a: rnd(256) }; },
  outs: ['a', 'y', 'c'] });
check({ name: 'print_men', setup: (M, rnd) => { M[0xA9] = rnd(256); } });
check({ name: 'print_sticks', setup: (M, rnd) => { M[0x9F] = rnd(256); } });
check({ name: 'print_score', setup: (M, rnd) => { M[0xAA] = rnd(256); M[0xAB] = rnd(256); M[0xAC] = rnd(256); } });
check({ name: 'check_big_charge', setup: (M, rnd) => { M[0x3F78] = [0xA3, 0x00, 0x6F, 0x5C, rnd(256)][rnd(5)]; } });
check({ name: 'swap_face', cases: 3000, setup: (M, rnd) => {
  M[0xA7] = rnd(16); M[0xB4] = 1 + rnd(5);
  if (rnd(3) === 0) { const p = (M[0xB7] | M[0xB8] << 8) & 0x3FFF; M[p] = [0x94, 0x84, 0x01, 0x00][rnd(4)]; }
  return { c: rnd(2) };
} });
