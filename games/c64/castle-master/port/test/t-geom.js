'use strict';
// The renderer's geometry alone against the game's ($36A9-$3EE4): the matrix product, the
// transform, the classification, the edge cuts, the rejection, the clip and the projection, on
// vertices drawn from small and large coordinates of both signs, zeros among them.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 3000, outs: ['a', 'x', 'y'] }, o)).fails ? 1 : 0; };
const w = (M, a, v) => { M[a & 255] = v & 255; M[(a + 1) & 255] = (v >> 8) & 255; };
const coord = rnd => [0, 1, -1, rnd(2000) - 1000, rnd(200) - 100, rnd(65536) - 32768, rnd(8000) - 4000][rnd(7)];
const vertices = (M, rnd, at, n) => { for (let i = 0; i < n * 3; i++) w(M, at + 2 * i, coord(rnd)); };
t({ name: 'MULTIPLY_3X3_FIXED_MATRICES', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => { for (let i = 0; i < 18; i++) M[0x106C + i] = [0, 64, 0xC0, rnd(256)][rnd(4)]; } });
t({ name: 'TRANSFORM_VERTICES_TO_CAMERA_SPACE', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => {
  const n = 1 + rnd(8); M[0x10B0] = n; vertices(M, rnd, 0x02, n); for (let i = 0; i < 9; i++) M[0x106C + i] = rnd(256); } });
t({ name: 'CLASSIFY_VERTEX_AGAINST_CLIP_PLANE', outs: ['x', 'y'], setup: (M, c, rnd) => {
  M[0x104B] = rnd(7); const x = 6 * rnd(10); vertices(M, rnd, 0x3E + x, 1); return { x }; } });
t({ name: 'CLIP_EDGE_TO_SELECTED_PLANE', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => {
  M[0x104B] = 1 + rnd(5); const x = 6 * (1 + rnd(6)); vertices(M, rnd, 0x38 + x, 2); return { x }; } });
t({ name: 'PROJECT_VERTICES_PERSPECTIVE', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => {
  const n = 1 + rnd(8); M[0x10B0] = n; vertices(M, rnd, 0x3E, n);
  for (let i = 0; i < n; i++) if (rnd(4) === 0) w(M, 0x42 + 6 * i, 0); } });
t({ name: 'REJECT_PRETRANSFORMED_POLYGON_OUTSIDE_VIEW_VOLUME', setup: (M, c, rnd) => {
  const n = 1 + rnd(8); M[0x10B0] = n; M[0x107E] = 1 + rnd(5); vertices(M, rnd, 0x3E, n); } });
t({ name: 'REJECT_POLYGON_OUTSIDE_VIEW_VOLUME', setup: (M, c, rnd) => {
  const n = 1 + rnd(8); M[0x10B0] = n; M[0x107E] = 1 + rnd(5); vertices(M, rnd, 0x02, n); for (let i = 0; i < 9; i++) M[0x106C + i] = rnd(256); } });
t({ name: 'CLIP_POLYGON_TO_VIEW_VOLUME', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
  const n = 2 + rnd(5); M[0x10B0] = n; M[0x107E] = 1 + rnd(5);
  for (let i = 0; i < n * 3; i++) w(M, 0x3E + 2 * i, rnd(3) ? rnd(800) - 400 : coord(rnd)); } });
process.exitCode = f ? 1 : 0;
