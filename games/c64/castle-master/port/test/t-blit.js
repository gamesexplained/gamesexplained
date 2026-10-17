'use strict';
// The panel's drawing alone against the game's: the blitter on each of the families and row tables
// its callers give it (plain, edge-masked, shifted by each pixel pair, colour 0 transparent), the
// rectangle copies into the bitmap, the buffer's clear, and lines of text.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: ['a', 'x', 'y', 'c'] }, o)).fails ? 1 : 0; };
const setp = (M, zp, v) => { M[zp] = v & 255; M[zp + 1] = v >> 8; };
// [family, row table, stride, the pictures a caller asks for, how far across]
const USES = [
  [0x1DD9, 0x1C75, 1, () => 0, () => 0],
  [0x1E32, 0x1C75, 1, () => 0x80, r => 0x15 - 2 * r(10)],
  [0x1E32, 0x1DAD, 8, () => 0x80, r => 0x17 - 2 * r(11)],
  [0x1E9F, 0x1C75, 1, () => 0, () => 0],
  [0x1F49, 0x1C81, 1, () => 0, () => 3],
  [0x1F49, 0x1C89, 1, () => 0, () => 3],
  [0x1F6F, 0x1C75, 1, r => 0x80 | r(4), r => 4 + r(0x24)],
  [0x1E45, 0x1C75, 1, () => 0, () => 4],
  [0x1E8A, 0x1C75, 1, () => 0x80, r => r(0x21)],
  [0x1FB0, 0x1D65, 8, r => r(9), () => 1],
];
t({ name: 'BLIT_PACKED_2BPP_GRAPHIC', setup: (M, c, rnd) => {
  const [fam, tab, stride, pic, across] = USES[rnd(USES.length)];
  setp(M, 0x7A, fam); setp(M, 0x7C, tab); M[0x1C74] = stride;
  return { a: pic(rnd), x: across(rnd) & 255 };
} });
// the same families anywhere across, plain or transparent, to reach every shift
t({ name: 'BLIT_PACKED_2BPP_GRAPHIC', setup: (M, c, rnd) => {
  const [fam, tab, stride] = USES[rnd(USES.length)];
  setp(M, 0x7A, fam); setp(M, 0x7C, tab); M[0x1C74] = stride;
  return { a: rnd(2) << 7, x: rnd(0x18) };
} });
t({ name: 'COPY_BITMAP_RECTANGLE_FROM_ROW_POINTERS', setup: (M, c, rnd) => {
  const u = [[0x1DAD, 0, 6, 0x0E], [0x1D8F, 0, 0x0B, 0x0F], [0x1D7F, 1, 8, 8]][rnd(3)];
  setp(M, 0x7A, u[0]); setp(M, 0x7C, 0x1C75);
  return { a: u[1], x: u[2], y: u[3] };
} });
t({ name: 'CLEAR_LINEAR_30BYTE_ROWS', setup: (M, c, rnd) => {
  if (rnd(2)) return { c: 0 };
  setp(M, 0x7A, (M[0x10A0] | M[0x10A1] << 8) + 30 * rnd(60));
  return { c: 1, x: 1 + rnd(60) };
} });
// a line of text: up to 15 characters at $1220 (the flag byte at $121F), down the rows at $1D6F
const line = (M, c, rnd) => {
  M[0x121F] = rnd(2) ? 0 : 1 + rnd(255);
  for (let i = 0; i < 16; i++) M[0x1220 + i] = 0x20 + rnd(0x40);
  setp(M, 0x7E, 0x121F); setp(M, 0x7C, 0x1D6F); M[0x1C74] = 8;
  return { a: 1 + rnd(M[0x121F] ? 12 : 15), x: rnd(0x18) };
};
t({ name: 'DRAW_TEXT_TO_BITMAP', cases: 600, setup: line });
t({ name: 'DRAW_TEXT_HIGH_BIT_MERGE', cases: 600, setup: line });
process.exitCode = f ? 1 : 0;
