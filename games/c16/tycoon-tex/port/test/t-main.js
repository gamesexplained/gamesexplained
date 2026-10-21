'use strict';
// The main program's routines that can run alone, against the game's (lib.js). start, start_game,
// main_loop, level_complete, pressure_out, game_over and quit_game wait on the interrupt or run
// on into others, and are held to the game's in the lockstep.
const { check } = require('./lib.js');
const { Z, T } = globalThis.TexPort;
check({ name: 'delay', cases: 20, setup: (M, rnd) => ({ x: rnd(256) }), outs: ['x', 'y'] });
check({ name: 'clear_zero_page' });
const BCD = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x19, 0x29, 0x39, 0x59, 0x63, 0x99];
check({ name: 'next_level', cases: 1500, setup: (M, rnd) => {
  M[Z.level] = BCD[rnd(BCD.length)]; M[T.scene] = rnd(3); M[T.difficulty] = rnd(3);
  for (let a = Z.rnd0; a <= Z.rnd3; a++) M[a] = rnd(256);
} });
