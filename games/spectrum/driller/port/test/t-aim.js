'use strict';
// Lines, the crosshair, the laser and the copies to the screen (g-aim.js) against the game's own.
const { check, prefetch } = require('./check.js');
const R = ['draw_line', 'find_object', 'plot', 'aim_command', 'crosshair', 'copy_view', 'dissolve', 'pick_object'];
prefetch(R, { per: 6 });
let fails = 0;
fails += check({ name: 'plot', cases: 200 }).fails;
fails += check({ name: 'draw_line', cases: 200 }).fails;
// lines between any two points of the view
fails += check({ name: 'draw_line', from: 'copy_view', cases: 500, setup: (c, rnd) => {
  c.M[0x8A0E] = 1 + rnd(190); c.M[0x8A0F] = rnd(110); c.M[0x8A10] = 1 + rnd(190); c.M[0x8A11] = rnd(110);
} }).fails;
fails += check({ name: 'find_object', outs: ['a', 'ix'], cases: 200 }).fails;
fails += check({ name: 'find_object', from: 'copy_view', outs: ['a', 'ix'], cases: 400, setup: (c, rnd) => {
  c.regs.a = rnd(3) ? 0 : rnd(20); c.M[0x8916] = rnd(60);
} }).fails;
fails += check({ name: 'crosshair', cases: 200 }).fails;
fails += check({ name: 'crosshair', from: 'copy_view', cases: 400, setup: (c, rnd) => {
  c.M[0x88A0] = rnd(4) ? 1 + rnd(2 * c.M[0x88D9]) : rnd(5); c.M[0x88A1] = rnd(4) ? rnd(2 * c.M[0x88DA] + 1) : rnd(4);
} }).fails;
fails += check({ name: 'copy_view', cases: 100 }).fails;
fails += check({ name: 'dissolve', from: 'copy_view', cases: 100 }).fails;
fails += check({ name: 'pick_object', cases: 200 }).fails;
// the crosshair anywhere in the view, over whatever the moments of play have drawn
fails += check({ name: 'pick_object', from: 'copy_view', cases: 600, setup: (c, rnd) => {
  c.M[0x88A0] = 1 + rnd(2 * c.M[0x88D9]); c.M[0x88A1] = 1 + rnd(2 * c.M[0x88DA]);
} }).fails;
fails += check({ name: 'aim_command', cases: 200, countdown: 0x8FC2 }).fails;
for (let a = 0x15; a <= 0x1E; a++) {
  fails += check({ name: 'aim_command', from: 'copy_view', cases: 30, countdown: 0x8FC2, setup: (c, rnd) => {
    c.regs.a = a; c.M[0x88A2] = rnd(2) ? 0xFF : 0; c.M[0x88AC] = rnd(2) ? 0xFF : 0; c.M[0x88AD] = rnd(2) ? 0xFF : 0;
    c.M[0x88A0] = 1 + rnd(2 * c.M[0x88D9]); c.M[0x88A1] = 1 + rnd(2 * c.M[0x88DA]);
  } }).fails;
}
process.exitCode = fails ? 1 : 0;
