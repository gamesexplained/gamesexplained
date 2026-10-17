'use strict';
// The scene alone against the game's ($27B7-$35E7): the coarse bounds and the view matrix from
// any direction, then each moment's object lists traversed and queued from where its player stands
// and from places and directions drawn at random about it (the view rebuilt for them first by the
// port's own routines, checked above), and the painter's sort of what was queued; last the whole
// rebuild and draw, RENDER_SCENE_IF_DIRTY, with the bit that asks for it set.
const { check } = require('./check.js');
const { loadPort } = require('./port.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: ['a', 'x', 'y'] }, o)).fails ? 1 : 0; };
const CM = loadPort();
const w = (M, a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
const look = (M, rnd) => { M[0x2411] = rnd(0x48); M[0x2410] = rnd(4) ? rnd(0x48) : [0, 0x48, 0x50, 0xFF][rnd(4)]; };
const move = (M, rnd) => {
  if (rnd(3)) return;
  for (const a of [0x2407, 0x2409, 0x240B]) w(M, a, ((M[a] | M[a + 1] << 8) + rnd(2000) - 1000) & 0xFFFF);
};
// the view made again for the moment, as the scene's rebuild makes it
const view = (M, rnd) => {
  if (rnd(2)) { look(M, rnd); move(M, rnd); }
  const P = CM.makePort(M, {});
  P.COMPUTE_COARSE_VIEW_BOUNDS({}); P.BUILD_VIEW_PROJECTION_MATRIX({});
  M[0x1099] = 0;
  return P;
};
t({ name: 'COMPUTE_COARSE_VIEW_BOUNDS', setup: (M, c, rnd) => { look(M, rnd); move(M, rnd); M[0x2417] = rnd(5) ? 0 : 1; } });
t({ name: 'BUILD_VIEW_PROJECTION_MATRIX', outs: ['a', 'y'], setup: (M, c, rnd) => { look(M, rnd); if (rnd(4) === 0) M[0x2410] = 0; if (rnd(4) === 0) M[0x2411] = 0; } });
t({ name: 'BUILD_CUBOID_CAMERA_BASIS', setup: (M, c, rnd) => {
  view(M, rnd); w(M, 0x10AA, 0x9000 + rnd(0x100)); w(M, 0x108F, 0x9200 + rnd(0x100));
  for (let i = 0; i < 12; i++) M[0x9000 + i + (M[0x10AA] - 0)] = rnd(256);
  for (let i = 0; i < 16; i++) M[(M[0x108F] | M[0x1090] << 8) + i] = rnd(256); } });
// a list of the moment's: the area's or the global one
const list = (M, rnd) => (rnd(3) && M[0x242A]) ? { x: M[0x242A], p: M[0x242B] | M[0x242C] << 8 } : { x: M[0x1060], p: M[0x1061] | M[0x1062] << 8 };
t({ name: 'TRAVERSE_OBJECT_LIST', outs: ['a', 'y'], cases: 2500, setup: (M, c, rnd) => {
  view(M, rnd); const l = list(M, rnd); if (!l.x) { l.x = M[0x242A]; l.p = M[0x242B] | M[0x242C] << 8; }
  w(M, 0x80, l.p); return { x: l.x || 1 }; } });
t({ name: 'PAINTER_SORT_VISIBLE_ENTRIES', outs: ['a'], cases: 2500, setup: (M, c, rnd) => {
  const P = view(M, rnd);
  for (const l of [{ x: M[0x1060], p: M[0x1061] | M[0x1062] << 8 }, { x: M[0x242A], p: M[0x242B] | M[0x242C] << 8 }]) {
    if (!l.x) continue; w(M, 0x80, l.p); P.TRAVERSE_OBJECT_LIST({ x: l.x }); } } });
t({ name: 'RENDER_SCENE_IF_DIRTY', outs: ['c'], cases: 600, setup: (M, c, rnd) => {
  if (rnd(2)) { look(M, rnd); move(M, rnd); }
  M[0x1059] |= 4; M[0x1063] = 0; M[0x1065] = 0; if (M[0x1081] === 8) M[0x1081] = 0; } });
process.exitCode = f ? 1 : 0;
