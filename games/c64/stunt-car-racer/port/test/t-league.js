'use strict';
// The league and the track's building alone against the game's ($E85B-$EC10), on moments of play
// with the league's tables stirred, and every track built.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 300, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 2, rnd(256), rnd(256)][rnd(10)];
const league = (M, c, rnd) => {
  M[0x31A1] = rnd(3) ? 0 : rnd(8); M[0x31A2] = rnd(8);
  M[0xC718] = rnd(4); M[0xC360] = rnd(4); M[0xC77F] = rnd(6); M[0xC362] = [0, 0x40, 0x80, 0xC0][rnd(4)];
  const order = [...Array(12).keys()];
  for (let i = 11; i > 0; i--) { const j = rnd(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  for (let i = 0; i < 12; i++) {
    M[0xC70C + i] = order[i]; M[0xC758 + i] = order[i];
    M[0xC728 + i] = rnd(7); M[0xC734 + i] = rnd(7); M[0xC740 + i] = rnd(13); M[0xC71C + i] = rnd(4) ? rnd(256) : 0x50;
  }
  M[0x31A4] = rnd(2) ? 0x0B : rnd(12);
};
const L = { setup: league, outs: ['a', 'x', 'y'] };
T('NEW_LEAGUE', { cases: 30, setup: league });
T('RACE_OTHERS', { setup: league });
T('DIVISION_RANGE', L); T('RACE_PAIR', L); T('RACE_RESULT', L); T('SORT_DIVISION', L);
T('READ_TRACK', { setup: (M, c, rnd) => { M[0x1E] = rnd(256); M[0x1F] = 0xB0 + rnd(8); return { y: rnd(256) }; }, outs: ['a', 'y'] });
T('TRACK_STEP', { setup: (M, c, rnd) => { M[0x15] = rnd(256); return { a: rnd(256) }; }, outs: ['a', 'c'] });
T('BUILD_TRACK', { cases: 40, setup: (M, c, rnd) => ({ x: rnd(8) }) });
T('SHAPE_OFFSET', { setup: (M, c, rnd) => { M[0xA2] = rnd(256); return { y: rnd(16) }; }, outs: ['a', 'y'] });
T('SHAPE_OFFSET_B', { setup: (M, c, rnd) => { M[0xA2] = rnd(256); return { y: rnd(16) }; }, outs: ['a', 'y'] });
process.exitCode = f ? 1 : 0;
