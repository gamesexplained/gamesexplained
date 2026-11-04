'use strict';
// The track drawn into the view alone against the game's ($164D-$1B87, the command wrappers at
// $2C23-$2C4E), on the moments of play as they are and with the drawing's state stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 400, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 2, rnd(256), rnd(256)][rnd(10)];

T('NEW_VIEW');
T('DRAW_VIEW', { cases: 150, setup: (M, c, rnd) => {
  if (!rnd(4)) M[0x2F] = byte(rnd);
  if (!rnd(4)) M[0x6B] = [0, 0x80, 0xC0, 0x40][rnd(4)];
  if (!rnd(4)) M[0x8E] = byte(rnd);
} });
T('DRAW_PIECE', { cases: 300, setup: (M, c, rnd) => {
  M[0x2E] = M[0xC374];
  if (!rnd(2)) M[0x2E] = (M[0x2E] + rnd(4)) % M[0xC764];
  M[0xD0] = [0, 2][rnd(2)]; M[0x27] = rnd(3) ? 0 : rnd(4);
  if (!rnd(3)) M[0xA4] = byte(rnd);
} });
T('OVERLAP', { setup: (M, c, rnd) => {
  M[0xCC] = rnd(3) ? rnd(0x20) : 0x80; M[0xCD] = rnd(3) ? rnd(0x20) : 0x80;
  for (let i = 0; i < 0x40; i++) if (!rnd(3)) { M[0xA200 + i] = rnd(256); M[0xA298 + i] = byte(rnd); }
  return { x: rnd(0x20) };
}, outs: ['x'] });
T('NEXT_PIECE', { setup: (M, c, rnd) => { M[0xC3A9] = rnd(2) ? 0x80 : 0; M[0x9E] = 2 + rnd(30); }, outs: ['a', 'x', 'y'] });
T('PIECE_POINTS', { setup: (M, c, rnd) => {
  M[0x2E] = M[0xC374]; M[0xD0] = [0, 2][rnd(2)];
  if (!rnd(3)) M[0xD3] = byte(rnd);
  if (!rnd(3)) M[0x2E] = M[0xC766];
}, outs: ['x', 'y'] });
T('POINTS_TO_LINES', { cases: 300, setup: (M, c, rnd) => {
  if (!rnd(3)) M[0xC3A8] = byte(rnd);
  if (!rnd(3)) M[0xC3DC] = byte(rnd);
  if (!rnd(3)) M[0xD2] = rnd(0x30);
} });
T('ALONG_SIDE', { setup: (M, c, rnd) => { M[0xC6] = rnd(0x20); M[0xA0] = rnd(2); M[0xCC] = rnd(0x20); M[0xCD] = rnd(0x20); } });
T('TO_COPY', { setup: (M, c, rnd) => { M[0xC6] = rnd(0x20); } });
T('CLIP_NEAR', { setup: (M, c, rnd) => {
  M[0x27] = rnd(4);
  for (let i = 0; i < 6; i++) { M[0xA298 + i] = rnd(3) ? 0 : byte(rnd); M[0xA200 + i] = rnd(256); M[0xA2E4 + i] = [0, 0xFF, 1][rnd(3)]; M[0xA24C + i] = rnd(256); }
}, outs: ['x'] });
for (const n of ['CMD_CLEAR_VIEW', 'CMD_FILL_ABOVE', 'CMD_ROW_COLOURS', 'CMD_FILL_SPANS', 'CMD_COLUMN_LIMITS']) T(n, { cases: 100, setup: (M, c, rnd) => {
  if (!rnd(2)) M[0x6D] = rnd(2) ? 0x80 : 0;
  if (!rnd(3)) M[0xC359] = rnd(2) ? 0xE0 : 0;
} });
T('PIECE_AHEAD', { setup: (M, c, rnd) => { M[0x2E] = rnd(M[0xC764] + 1); }, outs: ['x'] });
T('PIECE_BEHIND', { setup: (M, c, rnd) => { M[0x2E] = rnd(M[0xC764] + 1); }, outs: ['x'] });
process.exitCode = f ? 1 : 0;
