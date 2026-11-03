'use strict';
// The controls and the ROM's KEY-SCAN (g-controls.js) checked against the game's own and the ROM's,
// on the moments the game calls them and with keys and joysticks held at random.
const { check, prefetch } = require('./check.js');
prefetch(['read_controls', 'read_keyboard', 0x028E], { per: 4 });
let fails = 0;
const keysAny = (c, rnd) => {
  const n = [0, 1, 1, 2, 2, 3][rnd(6)];
  c.keys = []; for (let i = 0; i < n; i++) c.keys.push(rnd(40));
  c.joy = rnd(4) ? 0 : rnd(32);
};
fails += check({ name: 'read_controls', outs: ['a'], cases: 200 }).fails;
for (const type of [0, 1, 2])
  fails += check({ name: 'read_controls', outs: ['a'], setup: (c, rnd) => { keysAny(c, rnd); c.M[0x622A] = type; c.regs.c = rnd(256); }, cases: 300, seed: 3 + type }).fails;
fails += check({ entry: 0x028E, from: 'read_controls', outs: ['d', 'e', 'zf'], cases: 200 }).fails;
fails += check({ entry: 0x028E, from: 'read_controls', outs: ['d', 'e', 'zf'], setup: keysAny, cases: 600, seed: 9 }).fails;
process.exitCode = fails ? 1 : 0;
