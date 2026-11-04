'use strict';
// The opponent's car alone against the game's ($E0F9-$E85A): where its corners are and how it is
// drawn, on moments of a league race where it is in sight (work/states/race-*), with its frame's
// numbers stirred; and the engine's note and the effects stopped, on any moment.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 300, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256), rnd(256)][rnd(12)];
const R = 'race-';
// a frame's numbers: centre, sizes and their fractions, as CAR_FRAME leaves them
const frame = (M, rnd) => {
  M[0xF8] = rnd(256); M[0xF9] = rnd(4) ? 0 : byte(rnd); M[0xFA] = rnd(256); M[0xFB] = rnd(4) ? 0 : byte(rnd);
  for (let a = 0xE8; a <= 0xF7; a++) M[a] = rnd(3) ? (rnd(0x60) - 0x30) & 255 : byte(rnd);
  M[0xFC] = rnd(2) ? 0xFF : 0;
  M[0xC3DA] = rnd(2) ? 0x80 : 0;
};
const points = (M, rnd) => { for (let x = 0; x < 0x50; x++) { M[0xA240 + x - 0x40 + 0x40] = rnd(256); } for (let x = 0x3C; x < 0x50; x++) { M[0xA200 + x] = rnd(256); M[0xA298 + x] = rnd(3) ? 0 : byte(rnd); M[0xA24C + x] = rnd(256); M[0xA2E4 + x] = rnd(3) ? 0 : byte(rnd); } };
T('STOP_EFFECTS', { cases: 50 });
T('ENGINE_SOUND', { setup: (M, c, rnd) => {
  M[0x6A] = rnd(2) ? 0 : byte(rnd); M[0x66] = rnd(256); M[0x0156] = rnd(256); M[0x0159] = byte(rnd);
  M[0x09] = rnd(256); M[0x0A] = byte(rnd); M[0x10] = rnd(256); M[0x11] = byte(rnd);
}, outs: ['a', 'x', 'y'] });
T('OPP_DRAW_HERE', { states: R, setup: (M, c, rnd) => {
  if (!rnd(4)) M[0xC36A] = byte(rnd); if (!rnd(4)) { M[0x3A] = 0; M[0x39] = rnd(20); }
  if (!rnd(3)) M[0x2F] = 0; if (!rnd(3)) M[0x6B] = byte(rnd); M[0xC366] = byte(rnd);
} });
T('DRAW_OPPONENT', { states: R, setup: (M, c, rnd) => { M[0xC3DA] = rnd(3) ? 0 : 0x80; if (!rnd(3)) M[0xC9] = 0; M[0xC3AB] = rnd(2); } });
T('CAR_FRACTIONS', { setup: (M, c, rnd) => frame(M, rnd), outs: ['a', 'x', 'y'] });
for (const n of ['CAR_SIDES', 'CAR_END', 'CAR_SIDE_A', 'CAR_SIDE_B', 'CAR_ROOF', 'CAR_PANEL'])
  T(n, { states: R, setup: (M, c, rnd) => { frame(M, rnd); points(M, rnd); } });
T('CAR_PANEL_AT', { states: R, setup: (M, c, rnd) => { frame(M, rnd); M[0xD9] = rnd(256); return { a: rnd(256) }; } });
T('PLACE_POINTS', { setup: (M, c, rnd) => { frame(M, rnd); points(M, rnd); return { x: [0, 4, 8][rnd(3)] }; }, outs: ['a', 'x', 'y'] });
T('CAR_FRAME', { states: R, setup: (M, c, rnd) => { if (rnd(2)) points(M, rnd); return { x: 0x3C + rnd(2) }; }, outs: ['a', 'x', 'y', 'c'] });
T('OPP_CORNERS', { states: R, outs: ['a', 'x', 'y'] });
T('OPP_SEGMENT', { states: R, setup: (M, c, rnd) => { if (rnd(2)) M[0x23] = rnd(256); if (rnd(2)) M[0xC4] = rnd(3) ? rnd(4) : byte(rnd); return { a: [0x40, 0xFF, 0, rnd(256)][rnd(4)] }; }, outs: ['a', 'x', 'y'] });
const pts = (M, rnd) => { for (let a = 0xC500; a < 0xC540; a++) if (!rnd(2)) M[a] = rnd(256); M[0x17] = rnd(256); M[0xC30B] = rnd(2) ? 0x80 : 0; };
T('POINT_ALONG', { states: R, setup: (M, c, rnd) => { pts(M, rnd); return { x: rnd(8) | (rnd(2) ? 0x20 : 0), y: 4 + rnd(8) }; }, outs: ['a', 'x', 'y'] });
T('POINT_PLUS', { states: R, setup: (M, c, rnd) => { pts(M, rnd); M[0x14] = rnd(256); M[0x15] = rnd(256); return { x: rnd(16), y: rnd(16) }; }, outs: ['a', 'x', 'y'] });
T('OPP_ALONG', { states: R, setup: (M, c, rnd) => { pts(M, rnd); M[0x9C] = rnd(256); return { x: rnd(2), y: 4 + 2 * rnd(2) }; }, outs: ['a', 'x', 'y'] });
T('OPP_ALONG_AT', { states: R, setup: (M, c, rnd) => { pts(M, rnd); return { x: rnd(5), y: 4 + rnd(4), a: rnd(256) }; }, outs: ['a', 'x', 'y'] });
T('PROJECT_CORNER', { states: R, setup: (M, c, rnd) => ({ x: 0x3C + rnd(4), y: 4 + rnd(8) }) });
T('OPP_BODY', { states: R, setup: (M, c, rnd) => { pts(M, rnd); M[0x9C] = rnd(256); } });
T('OPP_SEGMENT_POINTS', { states: R, setup: (M, c, rnd) => { if (!rnd(3)) M[0xA4] = M[0xA4] ? 0 : 0x80; return { a: rnd(M[0xBE] || 1) }; } });
T('SEGMENT_POINT', { states: R, setup: (M, c, rnd) => ({ x: rnd(4), y: rnd(40) }), outs: ['x', 'y'] });
process.exitCode = f ? 1 : 0;
