'use strict';
// The animated tiles' routines (src/g-tiles.js), each checked alone against the game's (check.js),
// on the moments of play.
//   node t-tiles.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 300), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
// a slot at one of the steps that has an effect, or the gunner's shot, now and then
function slot(M, rnd, x) {
  const k = rnd(8);
  if (k === 0) { const j = rnd(5); M[0x0250 + x] = M[0xC600 + j]; M[0x0258 + x] = M[0xC5FB + j]; }
  else if (k === 1) { M[0x0250 + x] = 0x89; M[0x0258 + x] = 5; }
  if (rnd(2)) M[0x0248 + x] = 0;
}
const T = [
  { name: 'animate_tiles', setup: (M, c, rnd) => { for (let x = 0; x < 8; x++) slot(M, rnd, x); return {}; } },
  { name: 'animate_tile', outs: ['x'], setup: (M, c, rnd) => { const x = rnd(8); slot(M, rnd, x); M[0x0250 + x] |= 0x80; return { x }; } },
  { name: 'tile_anim_header', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => ({ a: M[0x0250 + rnd(8)] }) },
  { name: 'copy_tile_frame', outs: ['a', 'y'], setup: (M, c, rnd) => { if (rnd(2)) M[0x58] = 1 + rnd(8); return {}; } },
  { name: 'tile_anim_sound', outs: ['x', 'y'], setup: (M, c, rnd) => { const x = rnd(8); slot(M, rnd, x); return { x }; } },
  { name: 'gunner_fires', outs: ['x'], setup: (M, c, rnd) => { const x = rnd(8); slot(M, rnd, x); return { x }; } },
];
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
