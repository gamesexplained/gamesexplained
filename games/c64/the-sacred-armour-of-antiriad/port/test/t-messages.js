'use strict';
// The panel's routines (src/g-messages.js), each checked alone against the game's (check.js), on
// the moments of play.
//   node t-messages.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 300), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
const pick = (rnd, a) => a[rnd(a.length)];
// the panel at any point: on or off, a message scrolling, waiting or done, the score rolling, the
// power-up at any stage
function panel(M, c, rnd) {
  for (const a of [0x8A, 0x7B, 0x47]) if (!rnd(3)) M[a] = rnd(2) ? 0x80 : 0;
  if (!rnd(3)) M[0x54] = rnd(2) ? 0x80 | rnd(0x16) : rnd(0x16);
  if (!rnd(3)) { M[0x55] = rnd(30); M[0x56] = rnd(2) ? 0 : rnd(8); }
  if (!rnd(3)) for (let x = 0; x < 8; x++) M[0x066A + x] = rnd(3) ? M[0x066A + x] : 0x80 | rnd(0x16);
  if (!rnd(3)) for (let x = 0; x < 4; x++) M[0x067A + x] = rnd(4) ? M[0x067A + x] : 0x80;
  if (!rnd(3)) M[0x41] = pick(rnd, [7, 5, 3, 1]);
  if (!rnd(3)) for (let x = 0; x < 5; x++) { M[0x0682 + x] = rnd(10); M[0x0687 + x] = rnd(3) ? M[0x0682 + x] : rnd(10); }
  if (!rnd(3)) { M[0x0697] = rnd(256); M[0x0698] = rnd(4); M[0x0699] = 0; }
  if (!rnd(3)) { M[0x38] = rnd(3) ? 0 : rnd(3); M[0x39] = rnd(3) ? 0 : 1; }
  if (!rnd(3)) M[0x0357] = rnd(2) ? 0x80 : 0;
  if (!rnd(3)) M[0x75] = rnd(4);
  if (!rnd(3)) { M[0x48] = rnd(8); M[0x49] = rnd(8); M[0x8D] = rnd(2) ? 0 : rnd(4); M[0x92] = rnd(3) ? rnd(0x22) : 0x1F; }
  if (!rnd(3)) M[0x0355] = pick(rnd, [0x8F, 0x90]);
  if (!rnd(3)) { M[0x0260 + 3 + rnd(5)] = M[0xFC54 + rnd(4)]; M[0x8C] = rnd(2) ? 0 : rnd(5); M[0x8B] = rnd(2) ? 0x0F : rnd(16); }
  if (!rnd(3)) M[0x44] = M[0x54];
  return {};
}
const T = ['scroll_message', 'shift_message', 'next_message', 'addon_message', 'clear_message_strip', 'roll_score',
  'digit_glyph_ptrs', 'score_digits', 'panel_sprites', 'panel_static', 'addon_icon', 'panel_power_up',
  'flash_items', 'draw_panel', 'clear_energy_bars'].map(name => ({ name, setup: panel }));
// a digit's glyph and character, as roll_score points at them
T.push({ name: 'roll_digit', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
  panel(M, c, rnd);
  const g = 0x7000 + 8 * (0xB6 + rnd(10)), d = 0x7000 + 8 * (0xE8 + rnd(5));
  M[0x28] = g & 255; M[0x29] = g >> 8; M[0x2A] = d & 255; M[0x2B] = d >> 8;
  return {};
} });
T.push({ name: 'start_message', outs: ['a'], setup: (M, c, rnd) => { panel(M, c, rnd); return { a: rnd(0x16) }; } });
T.push({ name: 'queue_message', outs: ['x'], setup: (M, c, rnd) => { panel(M, c, rnd); return { a: rnd(2) ? M[0x066A + rnd(8)] : 0x80 | rnd(0x16) }; } });
T.push({ name: 'add_weight', outs: ['x', 'y'], setup: (M, c, rnd) => { panel(M, c, rnd); return { x: 1 + rnd(9) }; } });
T.push({ name: 'radiation_clicks', outs: ['x'], setup: (M, c, rnd) => { panel(M, c, rnd); return { x: M[0x75] ^ 3 }; } });
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
