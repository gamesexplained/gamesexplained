'use strict';
// The crane at a race's start alone against the game's ($EC11-$ED7E), on moments of play with its
// count, the chains and the car's height stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 400, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256)][rnd(11)];
const crane = (M, c, rnd) => {
  M[0x2F] = [0, 0xE7, 0xE6, 0xE5, 0xE4, 0x81, 0x80, 0x7F, 1, 2, rnd(256)][rnd(11)];
  M[0xC36F] = byte(rnd); M[0xC37C] = rnd(2) ? 0 : byte(rnd); M[0xC398] = rnd(2) ? 0 : byte(rnd); M[0xC76C] = rnd(2) ? 0x80 : 0;
  M[0xC3DF] = [0x10, 0xF0, 0x2C, 0xD4, rnd(256)][rnd(5)]; M[0x34] = rnd(256);
  for (const a of [0x46, 0x64, 0xC35D, 0xC35E, 0xB5, 0xB6, 0x0171, 0x0174]) if (rnd(2)) M[a] = byte(rnd);
};
T('CRANE', { setup: crane, outs: ['a', 'x'] });
T('CRANE_LOWER', { setup: (M, c, rnd) => { crane(M, c, rnd); return { a: 2 + rnd(3) }; }, outs: ['a', 'c'] });
T('CRANE_SWING', { setup: (M, c, rnd) => { crane(M, c, rnd); return { a: rnd(2) ? 0 : 0xFF }; }, outs: ['a', 'y'] });
T('TURN_POINTS', { setup: (M, c, rnd) => { for (let a = 0x0774; a < 0x07C4; a++) if (!rnd(3)) M[a] = byte(rnd); M[0xC36F] = byte(rnd); M[0x2D] = byte(rnd); }, outs: ['a', 'x', 'y'] });
process.exitCode = f ? 1 : 0;
