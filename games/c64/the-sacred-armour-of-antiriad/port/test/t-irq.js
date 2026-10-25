'use strict';
// The interrupt's routines (src/g-irq.js) and the sound driver's entries (src/g-sound.js), each
// checked alone against the game's (check.js), on the moments of play: each band of raster_bands
// with the frame's tasks run or held back, the collision latches, the timers, the sprite shadows
// and the quit key.
//   node t-irq.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 300), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
// the beam on one of the three bands' lines; the frame's tasks free to run or still running, a
// room change pending or not, on the title or in a game
function band(M, c, rnd) {
  c.raster = [0x32, 0x40, 0xB2, 0xC0, 0xFA, 0x100, 0x120][rnd(7)];
  if (rnd(4) === 0) M[0xAB] = 0x80;
  if (rnd(6) === 0) M[0x6B] = 0x80 | rnd(4);
  if (rnd(6) === 0) M[0xB0] ^= 0x80;
  if (rnd(3) === 0) M[0x67] = rnd(4);
  c.latch = rnd(16);
  return {};
}
const T = [
  { name: 'raster_bands', setup: band, ignore: STACK },
  { name: 'latch_bg_hits', setup: (M, c, rnd) => { if (rnd(2)) M[0x6F] = 0; c.vic[0x1F] = rnd(256); return {}; } },
  { name: 'latch_sprite_hits', setup: (M, c, rnd) => { if (rnd(2)) M[0x70] = 0; c.vic[0x1E] = rnd(256); return {}; } },
  { name: 'count_timers', setup: (M, c, rnd) => { for (const a of [0x93, 0x8C, 0x87, 0x8F, 0x91, 0x40, 0x68, 0x69]) M[a] = rnd(3) ? rnd(3) : rnd(256); for (let x = 0; x < 8; x++) M[0x0248 + x] = rnd(3); return {}; } },
  { name: 'copy_sprite_shadows', outs: ['a', 'x'] },
  { name: 'check_quit_key', setup: (M, c, rnd) => { if (rnd(2)) M[0xB0] |= 0x80; c.game.keys = new Set(rnd(2) ? [] : [0x3E + rnd(2)]); return {}; } },
  { name: 'music_tick', ignore: STACK },
  { name: 'sound_tick', ignore: STACK },
];
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [] }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
