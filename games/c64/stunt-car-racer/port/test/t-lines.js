'use strict';
// The lines alone against the game's ($F82B-$FF93), on moments of play with the points, the
// columns' tops and the drawing's mode (the code the game rewrites) stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 400, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 0x3F, 0xBF, rnd(256), rnd(256)][rnd(12)];
// the drawing's mode, as the game sets it: the track's or the car's test, the limit's page, the
// hiding branch, the AND or a BIT, the mask table
const mode = (M, rnd) => {
  const k = rnd(7);
  const put = (y, n) => { for (let x = 0x10; x >= 0; x--, y--) for (const s of [0xF8CB, 0xF9D2, 0xFADA, 0xFBC1]) M[s + x] = M[0xFC67 + y]; };
  if (k === 0 || k >= 5) { put(0x2A); M[0xC3AD] = 0x80; for (const s of [0xF92B, 0xFA32]) M[s] = 0xC5;
    if (k >= 5) for (const s of [0xF8CB, 0xF9D2, 0xFADA, 0xFBC1]) { M[s + 9] = 0xC5; if (k === 6) M[s + 0x0B] = 0xE2; } }
  else { put(0x11); M[0xC3AD] = 0; for (const s of [0xF92B, 0xFA32]) M[s] = 0xC6;
    if (k >= 3) for (const s of [0xF8CB, 0xF9D2, 0xFADA, 0xFBC1]) { M[s + 9] = 0xC5; if (k === 4) M[s + 0x0B] = 0xE2; } }
  const op = rnd(4) ? 0x3D : 0x2C, lo = rnd(2) ? 0 : 0x80;
  for (const s of [0xF8DE, 0xF9E5, 0xFAED, 0xFBD4]) { M[s] = op; M[s + 1] = lo; }
};
// the columns' tops, limits and lowest rows stirred
const columns = (M, rnd) => {
  for (let x = 0x40; x < 0xC0; x++) {
    if (rnd(3)) M[0xC600 + x] = rnd(2) ? 0xC0 : 0x40 + rnd(0x81);
    if (rnd(3)) M[0x0240 + x] = rnd(2) ? 0xC0 : 0x40 + rnd(0x81);
    if (rnd(4)) M[0xC500 + x] = rnd(2) ? 0 : 0x40 + rnd(0x81);
    if (rnd(4)) M[0xC540 + x] = 0x40 + rnd(0x81);
    if (rnd(4)) M[0xC580 + x] = 0x40 + rnd(0x81);
  }
};
// a point on the screen, near it or far off it
const point = (M, i, rnd) => {
  const k = rnd(4);
  const on = () => 0x30 + rnd(0xA0);
  M[0xA200 + i] = k ? on() : rnd(256); M[0xA24C + i] = k ? on() : rnd(256);
  M[0xA298 + i] = k > 1 ? 0 : [0, 0xFF, 1, 0xFE, 2][rnd(5)]; M[0xA2E4 + i] = k > 1 ? 0 : [0, 0xFF, 1, 0xFE][rnd(4)];
  M[0xA330 + i] = rnd(6) ? 0 : 0x80;
};
const line = (M, c, rnd) => {
  mode(M, rnd); columns(M, rnd);
  const x = rnd(0x46), y = rnd(0x46);
  point(M, x, rnd); point(M, y, rnd);
  M[0xC365] = rnd(2) ? 0x80 : 0; M[0x60] = byte(rnd); M[0x61] = byte(rnd);
  return { x, y };
};
const onScreen = (M, c, rnd) => { const r = line(M, c, rnd); for (const i of [r.x, r.y]) { M[0xA298 + i] = 0; M[0xA2E4 + i] = 0; M[0xA200 + i] = 0x38 + rnd(0x90); M[0xA24C + i] = 0x38 + rnd(0x90); } return r; };
T('LINE', { setup: line, outs: ['a', 'x', 'y'] });
T('LINE_CLIP', { setup: line, outs: ['a', 'x', 'y'] });
T('LINE_ON_SCREEN', { setup: onScreen, outs: ['a', 'x', 'y'] });
T('LINE_SPAN', { setup: onScreen, outs: ['a', 'x', 'y'] });
const ends = (M, c, rnd) => {
  mode(M, rnd); columns(M, rnd);
  for (const a of [0x4E, 0x4F, 0x50, 0x8A]) M[a] = rnd(3) ? 0x38 + rnd(0x90) : byte(rnd);
  if (M[0x50] < M[0x8A]) { const t = M[0x50]; M[0x50] = M[0x8A]; M[0x8A] = t; }
};
T('LINE_FROM_ENDS', { setup: ends, outs: ['a', 'x', 'y'] });
for (const name of ['LINE_UP_LEFT', 'LINE_UP_RIGHT', 'LINE_LEFT', 'LINE_RIGHT'])
  T(name, { setup: (M, c, rnd) => { ends(M, c, rnd); M[0x51] = byte(rnd); M[0x52] = byte(rnd); M[0x0F] = byte(rnd); return { a: byte(rnd), x: byte(rnd), y: byte(rnd) }; }, outs: ['a', 'x', 'y'] });
T('COVER_LEFT', { setup: (M, c, rnd) => { mode(M, rnd); return { a: byte(rnd), x: byte(rnd) }; }, outs: ['a', 'x'] });
T('COVER_ABOVE', { setup: (M, c, rnd) => { mode(M, rnd); for (const a of [0x8B, 0x8C]) M[a] = rnd(2) ? 0 : byte(rnd); M[0x4E] = byte(rnd); M[0x4F] = byte(rnd); }, outs: ['a', 'x', 'y'] });
T('LINE_COLOUR', { setup: (M, c, rnd) => ({ x: rnd(2) }), outs: ['a', 'x'] });
T('LINE_OPCODE', { setup: (M, c, rnd) => ({ a: rnd(2) ? 0x3D : 0x2C }), outs: ['a'] });
for (const name of ['LINE_MODE_TRACK', 'LINE_MODE_CAR', 'LINE_LIMIT', 'LINE_LIMIT_HIDE', 'COPY_LIMITS'])
  T(name, { cases: 50, setup: (M, c, rnd) => mode(M, rnd), outs: ['a', 'x', 'y'] });
T('SQUARE_PIECE', { setup: (M, c, rnd) => { M[0x5C] = byte(rnd); M[0x5E] = byte(rnd); M[0x0B] = (rnd(17) - 8) & 255; M[0x0C] = rnd(17); }, outs: ['a', 'x', 'c'] });
process.exitCode = f ? 1 : 0;
