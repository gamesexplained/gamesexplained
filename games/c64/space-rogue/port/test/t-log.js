'use strict';
// The log arithmetic alone against the game's (check.js).
const { check } = require('./check.js');
const rand = (M, c, rnd) => {
  for (let a = 0x5F; a <= 0x64; a++) M[a] = rnd(256);
  if (rnd(2)) { M[0x63] = (M[0x60] + rnd(12) - 6) & 255; }      // logs close together
  if (rnd(4) === 0) { M[0x62] = M[0x5F]; M[0x63] = M[0x60]; }
  if (rnd(3) === 0) M[0x61] = rnd(2) ? 0 : 0xFF;
};
let f = 0;
const t = o => { f += check(Object.assign({ cases: 4000 }, o)).fails ? 1 : 0; };
for (const name of ['log_add', 'log_sub', 'log_add_mag', 'log_sub_mag', 's_B2E7']) t({ name, setup: rand, outs: ['x', 'y', 'c'] });
t({ name: 'lin_to_log', setup: (M, c, rnd) => { rand(M, c, rnd); if (rnd(2)) M[0x61] = rnd(2) ? 0 : 0xFF; if (rnd(3) === 0) M[0x60] = 0; }, outs: ['a', 'x', 'y'] });
t({ name: 'int16_to_log', setup: (M, c, rnd) => { rand(M, c, rnd); if (rnd(3) === 0) M[0x61] = 0; }, outs: ['a', 'x', 'y'] });
t({ name: 'uint16_to_log', setup: rand, outs: ['a', 'x', 'y'] });
t({ name: 'byte_to_log', setup: (M, c, rnd) => { rand(M, c, rnd); return { a: rnd(256) }; }, outs: ['a', 'x', 'y'] });
t({ name: 'log_to_lin', setup: (M, c, rnd) => { rand(M, c, rnd); M[0x60] = rnd(3) ? (rnd(26) - 10) & 255 : rnd(256); }, outs: ['a', 'x', 'y'] });
t({ name: 'log_to_lin_signed', setup: (M, c, rnd) => { rand(M, c, rnd); M[0x60] = rnd(3) ? (rnd(26) - 10) & 255 : rnd(256); }, outs: ['a', 'x', 'y'] });
t({ name: 'clamp_s8', setup: (M, c, rnd) => { M[0x60] = rnd(256); M[0x61] = [0, 0xFF, rnd(256)][rnd(3)]; }, outs: ['a', 'x', 'y'] });
process.exitCode = f ? 1 : 0;
