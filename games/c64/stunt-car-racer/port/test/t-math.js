'use strict';
// The arithmetic alone against the game's ($C782-$C9E9, $CFB7, $FF8E), on random operands: small,
// large, signs and zeros, in random moments of play.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 3000, outs: ['a', 'x', 'y', 'c'] }, o)).fails ? 1 : 0; };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, rnd(256), rnd(256), rnd(256), rnd(256)][rnd(11)];
const put = (M, rnd, ...as) => { for (const a of as) M[a] = byte(rnd); };
const ops = (M, c, rnd) => { put(M, rnd, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x5A, 0x2D); return { a: byte(rnd), x: byte(rnd), y: byte(rnd) }; };
t({ name: 'MUL8', setup: ops, outs: ['a', 'c', 'z', 'n'] });
t({ name: 'SIN_COS', setup: ops, outs: ['a', 'x', 'c', 'z', 'n'] });
t({ name: 'MUL_S8_U8', setup: ops, outs: ['a', 'c'] });
t({ name: 'MUL_S16_U8', setup: ops, outs: ['a', 'c'] });
t({ name: 'MUL_S16_S8', setup: ops, outs: ['a', 'c'] });
t({ name: 'MUL_S16_MATRIX', setup: (M, c, rnd) => { const r = ops(M, c, rnd); r.x = rnd(40); put(M, rnd, 0x0774 + r.x, 0x079C + r.x); return r; }, outs: ['a', 'c'] });
t({ name: 'NEG16_IF_MINUS', setup: (M, c, rnd) => Object.assign(ops(M, c, rnd), { n: rnd(2) }), outs: ['a', 'c'] });
t({ name: 'NEG16', setup: ops, outs: ['a', 'c'] });
t({ name: 'ACOS_TABLE', setup: ops, outs: ['a', 'x'] });
t({ name: 'FIVE_SIXTEENTHS', setup: (M, c, rnd) => { const r = ops(M, c, rnd); r.x = rnd(40); put(M, rnd, 0x0774 + r.x, 0x079C + r.x); return r; }, outs: ['a'] });
t({ name: 'SQUARE_S16', setup: ops, outs: ['a', 'y', 'c'] });
t({ name: 'SHIFT16', setup: (M, c, rnd) => { const r = ops(M, c, rnd); r.y = [0, 1, 2, 3, 5, 8, 9, 12, 0xFF, 0xFE, 0xFC, 0xF8, 0xF0, rnd(256)][rnd(14)]; return r; }, outs: ['a', 'y', 'c'] });
t({ name: 'ADD16_18', setup: ops, outs: ['a', 'c'] });
t({ name: 'A_TO_15', setup: ops, outs: ['a', 'c'] });
t({ name: 'LOAD_14', setup: ops, outs: ['a', 'c'] });
process.exitCode = f ? 1 : 0;
