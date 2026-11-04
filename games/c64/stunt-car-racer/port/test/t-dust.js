'use strict';
// The random numbers, the dust and the debris alone against the game's ($29B9-$2AAD,
// $2C51-$2DC1), on moments of play with the specks and the car's state stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 600, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256), rnd(256)][rnd(12)];
const specks = (M, rnd) => {
  for (let x = 0; x < 0x20; x++) if (!rnd(3)) {
    M[0xC260 + x] = [0xD2, 0xD4, 0xB8, 0x41, 0x40 + rnd(0x78), rnd(256)][rnd(6)];
    M[0x80A0 + x] = [rnd(0x80), byte(rnd)][rnd(2)];
    M[0x4100 + x] = byte(rnd); M[0x4120 + x] = byte(rnd);
  }
  for (const a of [0xC30A, 0x0E, 0x6B, 0x0188, 0x6A, 0xC350]) if (!rnd(3)) M[a] = byte(rnd);
  if (!rnd(3)) M[0x6B] = [0, 0x80, 0xC0][rnd(3)];
};
T('RANDOM', { setup: (M, c, rnd) => { for (let a = 2; a < 7; a++) if (!rnd(2)) M[a] = byte(rnd); }, outs: ['a', 'x', 'y', 'c'] });
T('DEBRIS', { setup: (M, c, rnd) => { specks(M, rnd); M[0xC6] = rnd(0x20); return { x: rnd(256) }; }, outs: ['a', 'y'] });
T('DEBRIS_START', { setup: (M, c, rnd) => { specks(M, rnd); if (!rnd(3)) for (let y = 0; y < 0x80; y++) M[0xC640 + y] = 0x60; return { x: rnd(0x20) }; }, outs: ['a', 'x', 'y'] });
const sp = (M, c, rnd) => specks(M, rnd);
T('DUST_WRECKED', { setup: sp }); T('DUST_CLEAR', { setup: sp }); T('DUST', { setup: sp });
T('DUST_GO', { setup: (M, c, rnd) => { specks(M, rnd); return { x: rnd(0x20), a: byte(rnd) }; } });
T('DUST_PLOT', { setup: (M, c, rnd) => { specks(M, rnd); return { x: rnd(0x20) }; }, outs: ['a', 'x', 'z'] });
T('DUST_BYTE', { setup: (M, c, rnd) => ({ x: rnd(256), y: rnd(256) }), outs: ['a', 'x', 'y'] });
T('ENGINE_NOTE', { setup: (M, c, rnd) => { M[0x0156] = byte(rnd); M[0x0159] = byte(rnd); M[0x6A] = rnd(2); M[0x5D] = byte(rnd); }, outs: ['a'] });
process.exitCode = f ? 1 : 0;
