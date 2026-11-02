'use strict';
// Areas and rigs (g-area.js) against the game's own: the moments play calls each routine, then
// every area loaded, the rig in every state, and drilling at every heading.
const { check, prefetch } = require('./check.js');
const R = ['invert', 'enter_cell', 'init_game_data', 'load_area', 'place_rig', 'drill', 'show_message', 'rig_redraw'];
prefetch(R.concat(['copy_view']), { per: 6 });
let fails = 0;
fails += check({ name: 'invert', cases: 100 }).fails;
fails += check({ name: 'enter_cell', cases: 300 }).fails;
fails += check({ name: 'enter_cell', from: 'copy_view', cases: 400, setup: (c, rnd) => {
  for (const a of [0x88AF, 0x88B1, 0x88B3]) c.M[a] = (c.M[a] & 0xC0) | rnd(64);
} }).fails;
fails += check({ name: 'init_game_data', from: 'copy_view', cases: 20 }).fails;
fails += check({ name: 'load_area', cases: 50 }).fails;
fails += check({ name: 'load_area', from: 'copy_view', cases: 200, setup: (c, rnd) => {
  c.M[0x8862] = 1 + rnd(c.M[0xCF3E] + 2);
  for (let k = 0; k < 18; k++) c.M[0x877B + k] = rnd(4);
} }).fails;
fails += check({ name: 'place_rig', from: 'copy_view', cases: 200, setup: (c, rnd) => {
  c.M[0x8862] = 1 + rnd(0x16);
  for (let k = 0; k < 18; k++) c.M[0x877B + k] = rnd(4);
  for (let k = 0; k < 54; k++) c.M[0x882C + k] = rnd(256);
} }).fails;
fails += check({ name: "show_message", from: "copy_view", cases: 20, countdown: 0x8FC2, setup: c => { c.regs.ix = 0x8C12; c.regs.h = 0xCF; c.regs.l = 0xAD; } }).fails;
fails += check({ name: 'rig_redraw', from: 'copy_view', cases: 20, countdown: 0x8FC2 }).fails;
fails += check({ name: 'drill', cases: 50, countdown: 0x8FC2 }).fails;
for (const a of [0x28, 0x2A]) {
  fails += check({ name: 'drill', from: 'copy_view', cases: 120, countdown: 0x8FC2, setup: (c, rnd) => {
    c.regs.a = a;
    c.M[0x8FBC] = rnd(8) ? 1 : 2;
    c.M[0x876D] = rnd(0x48);
    const area = c.M[0x8862];
    if (area >= 1 && area < 0x13) c.M[0x877B + area - 1] = rnd(4);
    if (rnd(3) === 0) c.M[0x8875] = rnd(10);
    if (rnd(2)) c.M[0x879F] = 0;
  } }).fails;
}
process.exitCode = fails ? 1 : 0;
