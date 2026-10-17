'use strict';
// The arithmetic alone against the game's ($2470-$274C), on random operands: small, large, signs
// and zeros, as the renderer and the meter give them.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 4000, outs: ['a', 'x', 'y'] }, o)).fails ? 1 : 0; };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, rnd(256), rnd(256), rnd(256)][rnd(8)];
const put = (M, rnd, ...as) => { for (const a of as) M[a] = byte(rnd); };
t({ name: 'MUL_S16_S8_TO_S24', setup: (M, c, rnd) => ({ a: byte(rnd), x: byte(rnd), y: byte(rnd) }) });
t({ name: 'MUL_S16_S16_TO_S32', setup: (M, c, rnd) => { put(M, rnd, 0x88, 0x89, 0x8C, 0x8D); } });
t({ name: 'DIV_S24_BY_S16', setup: (M, c, rnd) => { put(M, rnd, 0x8C, 0x8D); if (!(M[0x8C] | M[0x8D])) M[0x8C] = 1; return { a: byte(rnd), x: byte(rnd), y: byte(rnd) }; } });
t({ name: 'MUL_S8_S8_TO_S16', setup: (M, c, rnd) => ({ x: byte(rnd), y: byte(rnd) }) });
t({ name: 'DIV_S32_BY_S16', setup: (M, c, rnd) => { put(M, rnd, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D); } });
process.exitCode = f ? 1 : 0;
