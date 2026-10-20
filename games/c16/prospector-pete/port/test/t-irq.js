'use strict';
// The interrupt during play and what it calls, against the game's (lib.js).
const { check } = require('./lib.js');
check({ name: 'scroll_view', cases: 3000, setup: (M, rnd) => {
  M[0x08] = [0x00, 0x01, 0xFF][rnd(3)]; M[0x02] = 0x26 + rnd(0x34); M[0x03] = 0x90 + rnd(8); M[0x06] = 1 + rnd(88);
} });
check({ name: 'draw_view', cases: 300, setup: (M, rnd) => { M[0x02] = 0x26 + rnd(0x34); } });
check({ name: 'sound', cases: 5000, setup: (M, rnd) => {
  for (const a of [0xBD, 0xC5, 0xBE, 0xBF, 0xC1, 0xC3]) M[a] = rnd(3) ? 0 : [1, 2, 0x80, 0x82, 0xFF, 5][rnd(6)];
  M[0xC2] = rnd(8); M[0xC0] = rnd(256); M[0xC4] = rnd(256); M[0x4A] = rnd(3) ? 0 : 1 + rnd(4); M[0x64] = rnd(256);
  return { c: rnd(2) };
}, chip: (a, rnd) => (a === 0xFF11 ? [0x30, 0x31, 0x14, 0x13, 0x40, 0x41, 0x50][rnd(7)] : rnd(256)) });
check({ name: 'irq_play', cases: 4000, stopAt: 0x1A0E, maxSteps: 2e5, setup: (M, rnd) => {
  M[0x04] = rnd(4); M[0xBB] = rnd(2); M[0x82] = rnd(2); M[0x80] = rnd(2); M[0x6B] = rnd(4) ? 0 : 1; M[0x89] = rnd(4) ? 0 : M[0x89];
  M[0x64] = rnd(256); M[0xA0] = rnd(16); M[0x7E] = 1 + rnd(2);
} });
