'use strict';
// Each routine the port has written, checked alone against the game's own over the moments in
// work/states (check.js). `node port/test/routines.js` runs them all; names on the command line run
// those only.
const { check } = require('./check.js');
const R = [];
const add = (name, o = {}) => R.push(Object.assign({ name, cases: 300 }, o));
// the interrupt's
add('sprites_to_irq', { outs: ['x'] });
add('sprites_sort', { outs: [] });
add('irq_status', { irq: true, outs: ['a'] });
add('irq_playfield', { irq: true, outs: [] });
add('read_joystick', { irq: true, outs: [] });
add('player_move', { irq: true, outs: [] });
add('player_animate', { irq: true, outs: [] });
add('find_top_sprite', { irq: true, outs: [] });
add('knife_hit_test', { irq: true, outs: [], setup: M => ({ a: M[0x0249] }) });
// the main program's
add('sprites_to_units', { outs: [] });
add('hero_chars', { outs: [] });
add('hero_floor_find', { outs: [] });
add('enemy_deaths', { outs: [] });
add('enemy_contact', { outs: [] });
add('pickup_update', { outs: [] });
add('jet_update', { outs: [] });
add('next_life_check', { outs: [] });
add('tune_playing', { outs: ['a', 'z'] });
// enemies
for (const n of ['enemy_floors', 'enemies_scroll', 'shots_scroll', 'enemies_ladders', 'enemies_anim', 'enemies_chars',
  'enemies_move', 'enemies_offscreen', 'enemies_turn_left']) add(n, { outs: [] });
// spawning
for (const n of ['enemy_hold_timers', 'spawn_timers', 'scripted_spawn', 'random_spawn', 'para_find', 'lorry_update',
  'missile_fight_spawn']) add(n, { outs: [] });
// weapons
for (const n of ['weapon_update', 'weapon_special', 'eshots_update', 'pshot_hits', 'shots_offscreen', 'shots_flash']) add(n, { outs: [] });
// fights
for (const n of ['prison_waves', 'harbour_fight_start', 'dog_handler', 'dogs_update', 'fight_update', 'fight_enemies',
  'bridge_fight_update', 'helis_launch', 'helis_place', 'helis_rotor', 'helis_move', 'helis_x_to_pixels', 'heli_hits']) add(n, { outs: [] });
// the screen
require('../src/names.js');
const N = globalThis.GBNames;
const bcd = rnd => (rnd(10) << 4) | rnd(10);
const skipFrame = { hooks: { [N.frame_wait]: c => { c.rts(); } }, onPort: P => { P.frame_wait = function* () { return { a: 1 }; }; } };
const skipWait = { hooks: { [N.wait_tune]: c => { c.rts(); } }, onPort: P => { P.wait_tune = function* () {}; } };
add('coarse_scroll', { outs: ['y'], setup: (M, c, rnd) => { M[N.coarse_due] = rnd(2); } });
add('column_draw', { outs: [], setup: (M, c, rnd) => { M[N.column_due] = rnd(4) ? 1 : 0; } });
for (const n of ['mines_place', 'chars_animate', 'anim_chars_restore', 'prison_setup', 'screen_clear', 'status_draw',
  'score_draw', 'hi_score_draw', 'draw_game_over', 'captives_place', 'captives_struggle', 'progress_done']) add(n, { outs: [] });
add('shots_vs_mines', { outs: [], setup: (M, c, rnd) => {
  for (let x = 0; x < 3; x++) if (rnd(2)) { M[N.shot_active + x] = 1; M[N.shot_y + x] = 0xD8 + rnd(16); M[N.shot_xu + x] = rnd(0xA0); M[N.shot_speed + x] = rnd(3) ? 0 : 1; }
  if (rnd(2)) M[N.weapon] = 3;
  for (let y = 0; y < 0x26; y++) if (!rnd(6)) { const k = (M[N.stage] & 3) << 1; M[0x4398 + y] = M[0x3C8C + k]; M[0x4399 + y] = M[0x3C8D + k]; }
} });
add('mine_destroy', { outs: ['a', 'y'], setup: (M, c, rnd) => ({ y: rnd(0x30) }) });
add('is_mine', { outs: ['a', 'y', 'z'], setup: (M, c, rnd) => ({ a: rnd(2) ? M[0x3C8C + ((M[N.stage] << 1) & 255) + rnd(2)] : rnd(256), y: rnd(0x28) }) });
add('mine_check', Object.assign({ outs: [], setup: (M, c, rnd) => { if (rnd(2)) M[N.hero_char] = M[0x3C8C + ((M[N.stage] << 1) & 255) + rnd(2)]; } }, skipWait));
add('stage_draw', Object.assign({ cases: 60, outs: [] }, skipFrame));
add('lives_draw', { outs: ['a'], setup: (M, c, rnd) => { M[N.lives] = rnd(10); } });
add('score_add', { outs: [], setup: (M, c, rnd) => { for (let k = 0; k < 3; k++) { M[N.points_due + k] = bcd(rnd); M[N.score + k] = bcd(rnd); } } });
add('hi_score_check', { outs: [], setup: (M, c, rnd) => { for (let k = 0; k < 3; k++) { M[N.hi_score + k] = bcd(rnd); M[N.score + k] = rnd(3) ? M[N.hi_score + k] : bcd(rnd); } } });
add('draw_ammo', { outs: [], setup: (M, c, rnd) => { M[N.weapon] = rnd(5); M[N.ammo] = rnd(8); } });
add('title_wait', Object.assign({ cases: 40, outs: [], setup: M => { M[N.joy] = 0x1F; } }, skipFrame));
// the texts at the stages the game draws them at: the credits on the title, RESCUE THE CAPTIVES in the
// intro and the intermissions, WELL DONE in the intermissions, and the ending's (stage 4)
const TEXTS = [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 4]];
add('text_draw', { outs: ['x', 'y'], setup: (M, c, rnd) => { const [a, st] = TEXTS[rnd(TEXTS.length)]; M[N.stage] = st; return { a }; } });
add('picture_draw', { cases: 60, outs: [], setup: (M, c, rnd) => ({ a: rnd(4) }) });
add('swaps_undo', { cases: 100, outs: [], setup: (M, c, rnd) => { for (let y = 0; y < 9; y++) M[N.swap_flags + y] = rnd(4) ? 0 : 1; } });
add('block_swap', { cases: 100, outs: ['a', 'x', 'y'], setup: (M, c, rnd) => ({ a: rnd(9) }) });
add('guards_send', { outs: [] });
add('hero_walk_map', { outs: [], setup: (M, c, rnd) => { M[N.player_xu] = 0x80 + rnd(16); M[N.spr_y] = 0x50 + rnd(0x80); } });
add('rescue_walk', { outs: [], setup: (M, c, rnd) => { M[N.player_xu] = rnd(0xA0); } });
add('map_progress', { outs: [], setup: (M, c, rnd) => { M[N.stage] = 1 + rnd(3); } });

const only = process.argv.slice(2);
let bad = 0;
for (const o of R) if (!only.length || only.includes(o.name)) bad += check(o).fails ? 1 : 0;
process.exit(bad ? 1 : 0);
