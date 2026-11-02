'use strict';
// The arithmetic (g-maths.js) checked against the game's own on the moments it is called.
const { check, prefetch } = require('./check.js');
const R = ['mul_16x8', 'mul_16x16', 'div_24_16', 'mul_s8', 'div_32_16', 'write_number', 'print_text'];
prefetch(R, { per: 6 });
let fails = 0;
fails += check({ name: 'mul_16x8', outs: ['a', 'h', 'l'], cases: 400 }).fails;
fails += check({ name: 'mul_16x16', outs: ['d', 'e', 'h', 'l'], cases: 400 }).fails;
fails += check({ name: 'div_24_16', outs: ['a', 'h', 'l', 'd', 'e'], cases: 400 }).fails;
fails += check({ name: 'mul_s8', outs: ['h', 'l'], cases: 400 }).fails;
fails += check({ name: 'div_32_16', outs: ['d', 'e', 'h', 'l', 'b', 'c'], cases: 400 }).fails;
// random operands too: the edges the moments of play may not reach
const rndRegs = (c, rnd) => { for (const k of ['a', 'b', 'c', 'd', 'e', 'h', 'l']) c.regs[k] = rnd(256); };
const edge = (c, rnd) => { rndRegs(c, rnd); const v = [0, 0x80, 0xFF, 0x7F, 1]; for (const k of ['a', 'b', 'd', 'h']) if (rnd(3) === 0) c.regs[k] = v[rnd(5)]; for (const k of ['c', 'e', 'l']) if (rnd(3) === 0) c.regs[k] = v[rnd(5)] & 0x80 ? 0 : v[rnd(5)]; };
for (const [n, outs] of [['mul_16x8', ['a', 'h', 'l']], ['mul_16x16', ['d', 'e', 'h', 'l']], ['div_24_16', ['a', 'h', 'l', 'd', 'e']], ['mul_s8', ['h', 'l']], ['div_32_16', ['d', 'e', 'h', 'l', 'b', 'c']]])
  fails += check({ name: n, outs, cases: 2000, setup: edge, seed: 7 }).fails;
fails += check({ name: 'write_number', cases: 200 }).fails;
fails += check({ name: 'print_text', cases: 200 }).fails;
process.exitCode = fails ? 1 : 0;
