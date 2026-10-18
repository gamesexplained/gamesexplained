'use strict';
// The sprites alone against the game's: the drawing order, the setting up, the visibility mask
// and the four drawers, as play calls them; then the drawers and the clipping at any place in
// the view, a whole or a half character across.
const { check, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, o)).fails ? 1 : 0; };
const L = labels();
const at = name => entries(L.byName.get(name).a, -1, {});
t({ name: 'type_byte', outs: ['bc'] });
t({ name: 'times_four', outs: ['bc'] });
t({ name: 'multiply', outs: ['hl'] });
t({ name: 'divide_8', outs: ['a'] });
t({ name: 'coarse_position' });
t({ name: 'clip_sprite', outs: ['zf', 'b', 'c', 'd', 'e'] });
t({ name: 'patch_drawers', outs: ['e'] });
t({ name: 'mirror_24', outs: ['b', 'c', 'e', 'bc_', 'de_'] });
t({ name: 'mirror_16', outs: ['d', 'e'] });
t({ name: 'set_up_sprite', outs: ['zf'] });
t({ name: 'build_mask' });
// the sprite's coarse place moved a little, onto more of the scenery in front
t({ name: 'build_mask', cases: 300, setup: (c, rnd) => {
  c.M[0xA03D] = (c.M[0xA03D] + rnd(5) - 2) & 255; c.M[0xA03E] = (c.M[0xA03E] + rnd(5) - 2) & 255;
  c.M[0xA03A] = (c.M[0xA03A] + rnd(5) - 2) & 255; c.M[0xA03B] = (c.M[0xA03B] + rnd(5) - 2) & 255;
} });
t({ name: 'cut_occluder' });
t({ name: 'shift_mask_half' });
for (const name of ['draw_sprite_24', 'draw_sprite_24_left', 'draw_sprite_16', 'draw_sprite_16_left']) t({ name });
// every pixel position, mirrored or not
for (const name of ['draw_sprite_24', 'draw_sprite_16']) t({ name, cases: 300, setup: (c, rnd) => {
  const p = (c.regs.iy + 0x14) & 0xFFFF;
  c.M[p] = (c.M[p] & 0xF8) | rnd(8);
  c.M[0xA05C] ^= rnd(2) << 7;
} });
t({ name: 'next_to_draw', outs: ['zf', 'iy'] });
t({ name: 'draw_two_pieces' });
t({ name: 'draw_actors' });
// the view anywhere near where it stands: its column and pixel row, either half
const sets = at('draw_actors');
t({ name: 'draw_actors', cases0: sets, cases: 200, setup: (c, rnd) => {
  c.M[0x9633] = (c.M[0x9633] + rnd(9) - 4) & 255;
  c.M[0x9632] = rnd(8); c.M[0x9631] = rnd(2);
} });
process.exitCode = f ? 1 : 0;
