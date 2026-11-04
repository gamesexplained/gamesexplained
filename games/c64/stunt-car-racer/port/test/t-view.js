'use strict';
// The pieces, the view's setting up and the race's start alone against the game's ($F021-$F829),
// on moments of play with the car's place, the view and the counts stirred.
const { check } = require('./check.js');
const { loadPort } = require('./port.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 300, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256)][rnd(11)];
const pieces = M => M[0xC764] || 1;
const quarter = rnd => [0, 0x40, 0x80, 0xC0][rnd(4)] | (rnd(4) ? 0 : rnd(64));
// the car's place, heading and tilt stirred
const place = (M, rnd) => {
  for (let a = 0x0100; a < 0x0109; a++) if (rnd(2)) M[a] = rnd(4) ? rnd(256) : byte(rnd);
  for (const a of [0x0106, 0x0108]) if (rnd(2)) M[a] = rnd(8);
  if (rnd(2)) M[0x0125] = rnd(256);
  for (const a of [0x0121, 0x0122, 0x0124, 0x0160, 0x0161]) if (rnd(2)) M[a] = byte(rnd);
};
const view = (M, rnd) => {
  M[0x68] = quarter(rnd);
  for (const a of [0x5C, 0x5E, 0xCF, 0xD1]) if (rnd(2)) M[a] = byte(rnd);
};
T('BAR_PART_AT', { setup: (M, c, rnd) => ({ y: rnd(2) ? rnd(11) : rnd(256) }), outs: ['a', 'y', 'c'] });
T('PIECE_LOAD', { setup: (M, c, rnd) => ({ x: rnd(pieces(M)) }), outs: ['a', 'x', 'y'] });
T('PIECE_ORIGIN', { setup: (M, c, rnd) => { view(M, rnd); return { x: rnd(pieces(M)) }; }, outs: ['a', 'x', 'y'] });
T('PIECE_NEIGHBOUR', { setup: (M, c, rnd) => ({ a: byte(rnd), y: byte(rnd), x: rnd(2) ? M[0x044E + rnd(pieces(M))] : byte(rnd) }), outs: ['a'] });
T('VIEW_SQUARE', { setup: (M, c, rnd) => { place(M, rnd); return { a: quarter(rnd) }; }, outs: ['a', 'x', 'y'] });
T('VIEW_NEGATE', { setup: (M, c, rnd) => { place(M, rnd); return { x: rnd(2) * 2, y: rnd(2) * 2 }; }, outs: ['a', 'c'] });
T('VIEW_COPY', { setup: (M, c, rnd) => { place(M, rnd); return { x: rnd(2) * 2, y: rnd(2) * 2 }; }, outs: ['a'] });
T('CAMERA', { setup: (M, c, rnd) => { place(M, rnd); }, outs: ['a', 'x', 'y'] });
T('SIDEWAYS', { setup: (M, c, rnd) => {
  for (const a of [0xB7, 0xB8, 0xA4, 0x6B]) if (rnd(2)) M[a] = byte(rnd);
  if (rnd(2)) M[0xB8] = rnd(2) ? 0 : 0xFF;
}, outs: ['a', 'x', 'y'] });
T('MAP_SQUARE', { cases: 150, setup: (M, c, rnd) => { view(M, rnd); return { x: (rnd(17) - 8) & 255, y: rnd(17) }; }, outs: ['x', 'y'] });
T('MAP_SQUARES', { cases: 6, setup: (M, c, rnd) => { view(M, rnd); }, outs: ['x', 'y'] });
T('TRACK_PREVIEW', { cases: 8, setup: (M, c, rnd) => { M[0xC34C] = rnd(256); }, outs: ['a', 'x', 'y'] });
const proj = (M, rnd) => { for (const a of [0x77, 0x51, 0x78, 0x52]) M[a] = rnd(3) ? rnd(256) : byte(rnd); return { x: rnd(0x40) }; };
T('PROJECT_X_PAIR', { setup: (M, c, rnd) => proj(M, rnd), outs: ['a', 'x'] });
T('PROJECT_X_HALF', { setup: (M, c, rnd) => proj(M, rnd), outs: ['x'] });
T('REVERSE_POINTS', { setup: (M, c, rnd) => { M[0x9E] = 2 + 2 * rnd(24); }, outs: ['a', 'x', 'y'] });
T('START_PLACE', { cases: 60, setup: (M, c, rnd) => {
  M[0xC37C] = rnd(2) ? 0 : byte(rnd); M[0xC345] = rnd(256); M[0xC3D0] = rnd(4);
  M[0xC779] = rnd(3);
  for (let i = 0; i < 3; i++) M[0x0190 + i] = rnd(pieces(M));
  return { x: rnd(pieces(M)) };
}, outs: ['a'] });
T('CAR_GAP', { setup: (M, c, rnd) => {
  for (const a of [0x22, 0x23, 0xC3, 0xC4]) M[a] = rnd(2) ? rnd(256) : byte(rnd);
  M[0xC374] = rnd(pieces(M)); M[0xC375] = rnd(pieces(M));
}, outs: ['a', 'x', 'y'] });
T('SAME_LAP', { setup: (M, c, rnd) => {
  M[0xC378] = rnd(4); M[0xC379] = rnd(2) ? M[0xC378] : rnd(4);
  M[0xC374] = rnd(pieces(M)); M[0xC375] = rnd(2) ? M[0xC374] : rnd(pieces(M)); M[0xC77C] = rnd(pieces(M)); M[0x3B] = byte(rnd);
}, outs: ['a', 'n', 'z'] });
T('BOOST', { setup: (M, c, rnd) => {
  M[0xC398] = rnd(3) ? 0 : byte(rnd); M[0x0E] = rnd(3) ? 0 : byte(rnd); M[0xC39B] = byte(rnd); M[0x66] = rnd(32);
  M[0xC76A] = rnd(4) ? (rnd(10) << 4) | rnd(10) : 0; M[0xC36E] = rnd(3) ? 0 : rnd(256); M[0xC388] = rnd(16);
  M[0x0150] = rnd(256); M[0x0151] = rnd(256); M[0x6E] = rnd(256);
}, outs: ['a'] });
const bary = (M, c, rnd) => ({ y: 8 + 24 * rnd(10) });
T('BAR_HOLE', { setup: bary, outs: ['a', 'x', 'y'] });
T('BAR_HOLE_LIT', { setup: bary, outs: ['a', 'x', 'y'] });
T('BAR_GAP', { setup: (M, c, rnd) => ({ y: 24 * rnd(10) }), outs: ['a', 'x', 'y'] });
T('BAR_BYTES', { setup: (M, c, rnd) => ({ x: 8 * rnd(8), y: rnd(0xF0) }), outs: ['a', 'x', 'y'] });
T('BAR_WHOLE', { setup: (M, c, rnd) => { M[0x16] = byte(rnd); return bary(M, c, rnd); }, outs: ['a', 'x', 'y'] });
T('DAMAGE_BAR', { cases: 100, setup: (M, c, rnd) => { M[0xC719] = rnd(12); }, outs: ['a', 'x', 'y'] });
// a save made on a copy by the port, so that a read of it can succeed
let CM = null;
const made = M => {
  CM = CM || loadPort();
  const C = M.slice(); C[1] = M[1];
  const P = CM.makePort(C, { read: () => 0, write: () => {} });
  P.SAVE_CODE({ a: 0 });
  return C;
};
T('SAVE_CODE', { cases: 60, setup: (M, c, rnd) => {
  M[0xC77E] = rnd(4) ? 0x80 : 0; M[0x31A1] = rnd(2) ? 0 : rnd(3);
  for (let x = 0; x < 0x1B; x++) if (rnd(2)) M[0xC700 + x] = rnd(256);
  const k = rnd(3);
  if (k === 0) return { a: 0 };
  if (k === 1) { const C = made(M); for (let a = 0x8000; a < 0x802B; a++) M[a] = C[a]; if (rnd(4) === 0) M[0x8025 + rnd(27)] ^= 1; return { a: 0x80 }; }
  for (let x = 0; x < 0x1B; x++) { M[0x8000 + x] = 0; M[0x8025 + x] = 1 + rnd(255); }
  return { a: 0x80 };
}, outs: ['a', 'c'] });
T('READ_CONTROLS', { setup: (M, c, rnd) => {
  c.game.keys.clear();
  for (let i = rnd(3) ? rnd(2) : rnd(6); i; i--) c.game.keys.add(rnd(64));
  c.game.joy = rnd(2) ? 0x1F : (0x1F & ~(1 << rnd(5)));
  M[0x3DF8] = rnd(2) ? 0x80 : 0;
}, outs: ['a', 'z'] });
T('TIME_PENALTY', { setup: (M, c, rnd) => { const x = rnd(2); M[0xC3 + x] = rnd(3) ? 0 : rnd(4); M[0x22 + x] = rnd(256); return { x }; }, outs: [] });
process.exitCode = f ? 1 : 0;
