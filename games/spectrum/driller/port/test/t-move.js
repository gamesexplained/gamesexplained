'use strict';
// Moving the probe (g-move.js) against the game's own, on the moments play calls each routine.
const { check, prefetch } = require('./check.js');
const R = ['step_to', 'move_to', 'move_command', 'collide', 'set_area_colours'];
prefetch(R, { per: 6 });
let fails = 0;
fails += check({ name: 'collide', outs: ['a'], cases: 400 }).fails;
fails += check({ name: 'step_to', outs: ['a'], cases: 300 }).fails;
fails += check({ name: 'move_to', outs: ['a'], cases: 300 }).fails;
fails += check({ name: 'move_command', cases: 300, countdown: 0x8FC2 }).fails;
fails += check({ name: 'set_area_colours', cases: 100 }).fails;
// every command, from the moments move_command is called
for (let a = 1; a <= 0x14; a++) fails += check({ name: 'move_command', cases: 20, countdown: 0x8FC2, setup: c => { c.regs.a = a; } }).fails;
process.exitCode = fails ? 1 : 0;
