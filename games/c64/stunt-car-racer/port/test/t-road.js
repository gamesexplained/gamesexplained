'use strict';
// The car on the road alone against the game's ($9A38-$A1C6): its place on the piece under it,
// the road's height under its three points and their own heights, on moments of play with the
// eye's place, the points' offsets and the angles stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 300, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256)][rnd(11)];
const stir = (M, rnd, list) => { for (const a of list) if (rnd(2)) M[a] = rnd(3) ? rnd(256) : byte(rnd); };
const pieces = M => M[0xC764] || 1;
const near = (M, rnd) => (M[0xC374] + rnd(5) - 2 + pieces(M)) % pieces(M);
// the eye moved a little within its square, the view turned
const eye = (M, rnd) => {
  if (rnd(2)) M[0x68] = [0, 0x40, 0x80, 0xC0][rnd(4)];
  stir(M, rnd, [0x92, 0x94, 0xCF, 0xD1]);
  for (const a of [0xCF, 0xD1]) if (rnd(2)) M[a] = rnd(8);
};
// a piece loaded, as the routines that read ($9A) expect
const load = (M, rnd, P) => { M[0x2E] = near(M, rnd); };
T('PLACE_ON_PIECE', { cases: 300, setup: (M, c, rnd) => { eye(M, rnd); M[0x2E] = near(M, rnd); }, outs: ['a', 'x', 'y'] });
T('PLACE_ALONG', { setup: (M, c, rnd) => { stir(M, rnd, [0xB3, 0xB4, 0xA4]); if (rnd(2)) M[0xBE] = rnd(32); }, outs: ['a', 'x', 'y', 'c', 'n', 'z'] });
T('EYE_IN_PIECE', { setup: (M, c, rnd) => { stir(M, rnd, [0x3D, 0x92, 0x93, 0x94, 0x95]); }, outs: ['a', 'c', 'n', 'z'] });
T('ROAD_HEIGHT_AT', { cases: 3000, setup: (M, c, rnd) => { stir(M, rnd, [0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x5B, 0xDC]); }, outs: ['a', 'y', 'c', 'n', 'z'] });
T('CURVE_DISTANCE', { setup: (M, c, rnd) => { stir(M, rnd, [0xAB, 0xAC]); }, outs: ['a', 'x', 'y'] });
T('CURVE_DISTANCE_FIX', { setup: (M, c, rnd) => {
  stir(M, rnd, [0x51, 0x77, 0x52, 0x78, 0xC1, 0xC2]); M[0xC3CD] = rnd(11);
}, outs: ['a', 'y', 'c'] });
T('OFF_EDGE_HEIGHT', { setup: (M, c, rnd) => {
  stir(M, rnd, [0x14, 0x15, 0x16, 0xA4, 0xC359]);
  const v = rnd(2) ? (0x10000 - rnd(0x90)) : 0x0180 + rnd(0x140); M[0xC3A4] = v & 255; M[0xC3A5] = (v >> 8) & 255;
  if (rnd(3) === 0) { M[0xC3A4] = rnd(256); M[0xC3A5] = byte(rnd); }
  if (rnd(2)) M[0x16] = rnd(2); if (rnd(2)) M[0x15] = rnd(0x20);
}, outs: ['a', 'y', 'c', 'n', 'z'] });
T('POINT_HEIGHT', { cases: 2000, setup: (M, c, rnd) => { stir(M, rnd, [0x3F, 0x35, 0x40, 0x36, 0xA2]); return { x: rnd(3) ? rnd(0x40) : rnd(256) }; }, outs: ['a', 'x', 'y', 'c', 'n', 'z'] });
T('PIECE_POINT_IN_VIEW', { setup: (M, c, rnd) => { stir(M, rnd, [0x3D, 0x92, 0x93, 0x94, 0x95]); return { y: rnd(3) ? 2 + rnd(8) : rnd(256) }; }, outs: ['a', 'y', 'c', 'n', 'z'] });
T('CAR_POINT_HEIGHTS', { setup: (M, c, rnd) => { stir(M, rnd, [0x0121, 0x0123, 0x0124, 0x0126, 0x0101, 0x0104, 0x0107]); }, outs: ['a', 'x', 'c', 'n', 'z'] });
// the routines that read the piece's tables: the car's own piece loaded first by the game's way
const onPiece = (M, rnd) => { M[0x2E] = M[0xC374]; };
T('WHEELS_ROAD_HEIGHT', { setup: (M, c, rnd) => {
  stir(M, rnd, [0x0130, 0x0131, 0x0132, 0x0133, 0x0134, 0x0135, 0x0136, 0x0137, 0x0138, 0x0139, 0x013A, 0x013B, 0xB3, 0xB7, 0x0188, 0x0124]);
  for (const a of [0x0133, 0x0134, 0x0135, 0x0139, 0x013A, 0x013B]) if (rnd(2)) M[a] = (rnd(4) - 2) & 255;
  if (rnd(2)) M[0xB8] = rnd(2); if (rnd(2)) M[0xB4] = rnd(12);
}, outs: ['a', 'x', 'y', 'c'] });
T('OPP_ROAD_HEIGHT', { setup: (M, c, rnd) => { stir(M, rnd, [0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x5B, 0xDC]); return { x: rnd(3) }; }, outs: ['a', 'x', 'y', 'c', 'n', 'z'] });
T('ACROSS_LINE_ENDS', { setup: (M, c, rnd) => {
  M[0xC6] = rnd(0x40);
  for (let i = 0; i < 0x42; i++) if (rnd(2)) { M[0xA200 + i] = rnd(256); M[0xA298 + i] = rnd(3) ? rnd(2) : byte(rnd); }
}, outs: ['a', 'x', 'y', 'c'] });
T('KEY_PRESSED', { setup: (M, c, rnd) => { if (rnd(2)) c.game.keys.add(rnd(64)); return { x: rnd(2) ? rnd(64) : [0x20, 0x2F, 0x0D, 0x34][rnd(4)] }; }, outs: ['a', 'x', 'y', 'z', 'c', 'n'] });
T('WHEEL_TOP', { cases: 100, setup: (M, c, rnd) => ({ a: 0x97 + rnd(0x30) }), outs: ['a', 'x', 'y'] });
process.exitCode = f ? 1 : 0;
