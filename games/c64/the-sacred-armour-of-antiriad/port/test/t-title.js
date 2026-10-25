'use strict';
// The title's and the game's start and end routines that do not wait (src/g-title.js,
// src/g-game.js), each checked alone against the game's (check.js), on the moments of play. Those
// that wait (title_sequence, title_attract, title_credits, victory_sequence) are checked in the
// lockstep, along the route (lockstep.js).
//   node t-title.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 100), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
const any = (M, c, rnd) => { c.game.joy = 0x1F & ~rnd(32); if (rnd(2)) M[0xB4] = rnd(256); return {}; };
const T = ['title_tune_part1', 'title_tune_part2', 'title_tune_part3', 'read_fire', 'draw_title_screen',
  'copy_charset_from_io_ram', 'victory_tune', 'reset_tal_end', 'clear_game_state', 'clear_sprites', 'start_new_game']
  .map(name => ({ name, setup: any }));
T.push({ name: 'start_path_pair', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => ({ a: rnd(256) }) });
T.push({ name: 'print_text_block', setup: (M, c, rnd) => ({ a: 0 }) });
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
