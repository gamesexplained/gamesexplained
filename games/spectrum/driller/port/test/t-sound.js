'use strict';
// The sound effects (g-sound.js) against the game's: every effect, its writes to the beeper and the
// T-states between them, on moments of play borrowed from print_text (the sessions play few).
const { check } = require('./check.js');
let fails = 0;
for (let a = 1; a <= 21; a++) {
  fails += check({ name: 'play_sound', from: 'print_text', cases: 2, timed: true, setup: c => { c.regs.a = a; } }).fails;
}
fails += check({ name: 'play_sound', timed: true, cases: 50 }).fails;
process.exitCode = fails ? 1 : 0;
