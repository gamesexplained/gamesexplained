'use strict';
// The sprites' routines (src/g-sprites.js), each checked alone against the game's (check.js), on
// the moments of play.
//   node t-sprites.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 300), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
// an animation some slot is running, for a target
const anim = (M, rnd) => { for (let k = 0; k < 8; k++) { const a = M[0x0260 + rnd(8)]; if (a & 0x80) return a; } return 0x88; };
// slot X near an edge of the room now and then, moving, at the end of its frame wait
function slot(M, rnd, x) {
  const y = x << 1;
  if (!rnd(3)) M[0x0201 + y] = [0x1D, 0x20, 0x94, 0x98, 0x9C][rnd(5)] + rnd(5) - 2;
  if (!rnd(3)) M[0x0200 + y] = [0x0E, 0x2C, 0x32, 0x59, 0xFF, 0x02][rnd(6)] + rnd(5) - 2;
  if (!rnd(4)) M[0x0210] ^= 1 << x;
  if (!rnd(3)) { M[0x02F8 + x] = rnd(5); M[0x02F0 + x] = rnd(5); }
  if (!rnd(3)) M[0x02C8 + x] = rnd(16);
  if (!rnd(4)) M[0x6B] &= 0x7F;
  if (!rnd(2)) M[0x0268 + x] = 0;
  if (!rnd(5)) M[0x0260 + x] = M[0x06A3 + rnd(3)];
  if (!rnd(6)) M[0x0260 + x] = M[0x06A0 + rnd(3)];
  if (!rnd(6)) { const j = rnd(8); M[0x0260 + x] = M[0xC67B + j]; M[0x0270 + x] = M[0xC66B + j]; }
  if (x === 5 && !rnd(4)) M[0x0265] = 0xD2;
}
// slot X dissolving or materialising, at any step
function effect(M, rnd, x) {
  if (rnd(2)) M[0x0290 + x] = rnd(2) ? 0x80 : 0;
  if (rnd(2)) M[0x02A8 + x] = rnd(2) ? anim(M, rnd) | 0x80 : 0;
  if (rnd(2)) M[0x0298 + x] = rnd(2) ? 0 : rnd(4);
  if (rnd(2)) M[0x02B0 + x] = rnd(2) ? 0 : rnd(4);
  if (rnd(2)) M[0x02A0 + x] = rnd(10);
  if (rnd(2)) M[0x02B8 + x] = rnd(10);
  if (!rnd(4)) M[0x6E] ^= 0x80;
  if (!rnd(4)) M[0x88] ^= 0x80;
  if (!rnd(3)) M[0x7D] = rnd(8);
}
const one = (f, outs, lo = 0) => (M, c, rnd) => { const x = lo + rnd(8 - lo); f(M, rnd, x); return { x, y: x << 1 }; };
const all = f => (M, c, rnd) => { for (let x = 0; x < 8; x++) f(M, rnd, x); return {}; };
const T = [
  { name: 'move_sprites', setup: all(slot) },
  { name: 'move_up', outs: ['x', 'y'], setup: one(slot) },
  { name: 'move_down', outs: ['x', 'y'], setup: one(slot) },
  { name: 'move_left', outs: ['x', 'y'], setup: one(slot) },
  { name: 'move_right', outs: ['x', 'y'], setup: one(slot) },
  { name: 'land_object', outs: ['x'], setup: one(slot) },
  { name: 'animate_sprites', setup: all(slot) },
  { name: 'step_animation', outs: ['x'], setup: one(slot) },
  { name: 'spawn_enemy', outs: ['x'], setup: one(slot) },
  { name: 'anim_sounds', outs: ['x', 'y'], setup: (M, c, rnd) => { const x = rnd(8); slot(M, rnd, x); if (rnd(2)) M[0xB0] ^= 0x80; return { x }; } },
  { name: 'sprite_effects', setup: all(effect) },
  { name: 'dissolve_step', outs: ['x'], setup: one(effect) },
  { name: 'mask_sprite_shape', outs: ['a', 'x', 'y'], setup: one(effect) },
  { name: 'save_sprite_shape', outs: ['a', 'x', 'y'], setup: one(effect) },
  { name: 'restore_sprite_shape', outs: ['a', 'x', 'y'], setup: one(effect) },
  { name: 'materialise_step', outs: ['x'], setup: one(effect) },
  { name: 'draw_materialise', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { const x = rnd(8); effect(M, rnd, x); M[0x02A8 + x] = anim(M, rnd) | 0x80; return { x }; } },
  { name: 'save_target_shape', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { const x = rnd(8); effect(M, rnd, x); M[0x02A8 + x] = anim(M, rnd) | 0x80; return { x }; } },
];
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
