'use strict';
// The renderer's faces alone against the game's ($3EE5-$473A): the winding, the span painter, the
// two edge walkers and the two face emitters, on faces drawn at random over the view (120 by 121)
// and beyond it, and the cuboid's own topology at $12CC with its colours drawn at random.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 3000, outs: ['a', 'x', 'y'] }, o)).fails ? 1 : 0; };
const w = (M, a, v) => { M[a & 255] = v & 255; M[(a + 1) & 255] = (v >> 8) & 255; };
const coord = rnd => [0, 1, -1, rnd(2000) - 1000, rnd(200) - 100, rnd(65536) - 32768, rnd(8000) - 4000][rnd(7)];
const point = rnd => rnd(5) ? rnd(0x78) : [0, 0x77, 0x78, rnd(256)][rnd(4)];
const spans = (M, rnd) => { for (let i = 0; i < 0x79; i++) M[0x11A3 + i] = rnd(8) ? 0 : rnd(3); };
t({ name: 'CLASSIFY_PROJECTED_WINDING', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => {
  const base = rnd(2) ? 0x00C0 : 0x9000 + rnd(0x400); M[0x7A] = base & 255; M[0x7B] = base >> 8;
  const y = rnd(40); for (let k = 0; k < 6; k++) M[(base + y + k) & 0xFFFF] = point(rnd); return { y }; } });
t({ name: 'PAINT_SCANLINE_SPANS_LINEAR', setup: (M, c, rnd) => {
  const lo = rnd(0x79), hi = rnd(3) ? Math.min(0x78, lo + rnd(60)) : rnd(0x79); M[0x1054] = lo; M[0x1053] = hi;
  M[0x1235] = 1 + rnd(16);
  for (let i = 0; i < 0x79; i++) { M[0x11A3 + i] = rnd(3); M[0x10B1 + i] = rnd(0x78); M[0x112A + i] = rnd(0x78); } } });
t({ name: 'RASTERIZE_POLYGON_EDGES', setup: (M, c, rnd) => {
  spans(M, rnd); const n = 3 + rnd(6); M[0x10B0] = n; const base = 0x9000 + rnd(0x100); M[0x7C] = base & 255; M[0x7D] = base >> 8;
  for (let k = 1; k <= 2 * n; k++) M[base + k] = k & 1 ? rnd(0x78) : rnd(0x79);
  if (rnd(4) === 0) M[base + 4] = M[base + 2]; if (rnd(4) === 0) M[base + 3] = M[base + 1]; } });
t({ name: 'RASTERIZE_LINE_SPANS', setup: (M, c, rnd) => {
  spans(M, rnd); const base = 0x9000 + rnd(0x100); M[0x7C] = base & 255; M[0x7D] = base >> 8;
  for (let k = 1; k <= 4; k++) M[base + k] = k & 1 ? rnd(0x78) : rnd(0x79);
  if (rnd(4) === 0) M[base + 4] = M[base + 2]; if (rnd(4) === 0) M[base + 3] = M[base + 1]; } });
// the cuboid's faces: its six colours drawn, its eight vertices in the camera's frame
const cuboid = (M, rnd) => {
  for (const k of [1, 7, 13, 19, 25, 31]) M[0x12CC + k] = rnd(3) ? 1 + rnd(15) : 0;
  M[0x105C] = rnd(256); M[0x1069] = rnd(3); M[0x1235] = rnd(256); M[0x10B0] = 8; M[0x107E] = 1 + rnd(5);
  const cx = rnd(600) - 300, cy = rnd(600) - 300, cz = rnd(900) - 200, sx = 1 + rnd(300), sy = 1 + rnd(300), sz = 1 + rnd(300);
  for (let i = 0; i < 8; i++) { w(M, 0x3E + 6 * i, cx + (i & 1 ? sx : -sx)); w(M, 0x40 + 6 * i, cy + (i & 2 ? sy : -sy)); w(M, 0x42 + 6 * i, cz + (i & 4 ? sz : -sz)); }
  if (rnd(8) === 0) for (let i = 0; i < 24; i++) w(M, 0x3E + 2 * i, coord(rnd));
};
t({ name: 'paint_scanline_spans_linear_local_40da', outs: ['a', 'y'], setup: (M, c, rnd) => { cuboid(M, rnd); return { y: 0 }; } });
t({ name: 'emit_clipped_object_faces', outs: ['a', 'y'], setup: (M, c, rnd) => { cuboid(M, rnd); return { y: 0 }; } });
process.exitCode = f ? 1 : 0;
