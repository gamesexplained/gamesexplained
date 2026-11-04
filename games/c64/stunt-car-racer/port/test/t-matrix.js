'use strict';
// The car's rotation matrix and the turns made with it alone against the game's ($C9EA-$CD5B),
// on moments of play with the angles, the speeds, the forces and the spin stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 300, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256)][rnd(11)];
const stir = (M, rnd, list) => { for (const a of list) if (rnd(2)) M[a] = rnd(3) ? rnd(256) : byte(rnd); };
const angles = (M, rnd) => stir(M, rnd, [0x0121, 0x0122, 0x0123, 0x0124, 0x0125, 0x0126, 0x0189, 0x018A]);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const entry = rnd => rnd(2) ? 2 * rnd(18) : rnd(0x28);
T('MATRIX_PRODUCT', { setup: (M, c, rnd) => { M[0x15] = byte(rnd); return { x: entry(rnd), y: byte(rnd), n: rnd(2) }; }, outs: ['a', 'x', 'y'] });
T('MATRIX_TERM', { setup: (M, c, rnd) => ({ a: byte(rnd), x: entry(rnd), y: byte(rnd) }), outs: ['a', 'x', 'y'] });
T('MATRIX_PRODUCT_TC', { setup: (M, c, rnd) => { M[0x15] = byte(rnd); return { x: entry(rnd), y: byte(rnd), n: rnd(2) }; }, outs: ['a', 'x', 'y'] });
T('MATRIX_TO_TC', { setup: (M, c, rnd) => { const x = entry(rnd); M[0x0774 + x] = byte(rnd); M[0x079C + x] = byte(rnd); return { x }; }, outs: ['a', 'x', 'y'] });
T('ROTATION_MATRIX', { setup: (M, c, rnd) => { angles(M, rnd); }, outs: ['a', 'x', 'y'] });
const matrix = (M, rnd) => { if (rnd(3)) stir(M, rnd, range(0x0774, 0x07C3)); };
T('VELOCITY_TO_CAR', { setup: (M, c, rnd) => { matrix(M, rnd); stir(M, rnd, range(0x0109, 0x0111)); }, outs: ['a', 'x', 'y'] });
T('FORCES_TO_WORLD', { setup: (M, c, rnd) => { matrix(M, rnd); stir(M, rnd, range(0x015A, 0x015F)); }, outs: ['a', 'x', 'y'] });
T('SPIN_TO_ANGLES', { setup: (M, c, rnd) => { matrix(M, rnd); stir(M, rnd, range(0x010C, 0x0114)); }, outs: ['a', 'x', 'y'] });
T('PULL_IN_CAR', { setup: (M, c, rnd) => { matrix(M, rnd); }, outs: ['a', 'x', 'y'] });
process.exitCode = f ? 1 : 0;
