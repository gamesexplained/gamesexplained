'use strict';
// The steering and the windscreen's frame alone against the game's ($2DC2-$2FCD).
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256), rnd(256)][rnd(12)];
const small = rnd => [0, 1, 0xFF, 0xFE, 2, 3, 0xFD, 0x1E, 0x1D, 0x1F, 7, 8, rnd(256)][rnd(13)];
T('STEERING', { setup: (M, c, rnd) => {
  for (const a of [0xC5, 0xB2, 0x9D, 0xA4, 0xC8, 0x6A, 0x0159, 0x0156, 0x0122, 0x010D]) if (!rnd(2)) M[a] = byte(rnd);
  for (const a of [0x0125, 0x0113]) if (!rnd(2)) M[a] = small(rnd);
  if (!rnd(3)) M[0xC5] = [0, 0xF1, 0x0F][rnd(3)];
  if (!rnd(3)) M[0x0125] = (M[0x018A] ^ M[0xA4]) + small(rnd);
}, outs: ['a', 'y'] });
T('FRAME', { cases: 50 });
T('FRAME_PILLAR', { cases: 50, setup: (M, c, rnd) => { M[0x1E] = rnd(256); return { a: 0x41 + rnd(0x10), x: rnd(256), y: 0x60 + rnd(0x10) }; } });
process.exitCode = f ? 1 : 0;
