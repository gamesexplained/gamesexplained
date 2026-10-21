'use strict';
// Tex: his moves, drawing, jump, bullet and death, against the game's (lib.js).
const { check } = require('./lib.js');
const { Z, T } = globalThis.TexPort;
const nudge = (M, rnd, ...names) => { for (const n of names) if (rnd(3) === 0) M[Z[n]] = [0, 1, 2, rnd(256)][rnd(4)]; };
const bit = rnd => (rnd(2) ? 0x80 : 0) | rnd(0x80);
const cell = (M, rnd) => { M[Z.tex_cell] = [0xA9, 0xC3, 0xA9 + rnd(27)][rnd(3)]; M[Z.tex_cell + 1] = 0x0E; };
check({ name: 'move_tex', cases: 4000, setup: (M, rnd) => {
  nudge(M, rnd, 'paused', 'controls_off', 'jumping', 'bullet_flying', 'left_blocked', 'right_blocked', 'move_timer', 'jump_timer');
  for (const n of ['ctl_left', 'ctl_right', 'ctl_up', 'ctl_fire']) M[Z[n]] = bit(rnd);
  cell(M, rnd); M[Z.jump_steps] = rnd(12);
} });
check({ name: 'move_divider', setup: (M, rnd) => { M[Z.move_timer] = 1 + rnd(3); }, outs: ['c'] });
check({ name: 'set_speed', cases: 2000, setup: cell });
check({ name: 'draw_tex', cases: 2000, setup: (M, rnd) => { cell(M, rnd); if (rnd(4) === 0) { M[T.tex_layout_operand] = 0x97; } } });
check({ name: 'erase_tex', setup: (M, rnd) => { cell(M, rnd); if (rnd(4) === 0) M[T.erase_layout_operand] = 0x97; } });
check({ name: 'check_hole', cases: 2000, setup: (M, rnd) => {
  cell(M, rnd); const p = (0x0E00 | M[Z.tex_cell]) + 0x78; M[p] = [0x20, 0xD6, 0xDE, 0xE2, rnd(256)][rnd(5)]; M[p + 1] = rnd(256);
} });
check({ name: 'start_jump', setup: (M, rnd) => { nudge(M, rnd, 'jumping', 'tex_falling'); } });
check({ name: 'step_jump', cases: 3000, setup: (M, rnd) => { nudge(M, rnd, 'jumping'); M[Z.jump_timer] = 1 + rnd(3); M[Z.jump_steps] = rnd(14); cell(M, rnd); } });
check({ name: 'fire_bullet', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'bullet_flying', 'exploding'); cell(M, rnd); } });
check({ name: 'move_bullet', cases: 4000, setup: (M, rnd) => {
  nudge(M, rnd, 'paused', 'bullet_flying', 'bullet_timer', 'arrow_active', 'bouncy_active', 'explosive_active', 'jet_bomb_falling');
  if (M[Z.bullet_flying]) {
    const c = (M[Z.bullet_cell] | M[Z.bullet_cell + 1] << 8) & 0x3FFF;
    if (c >= 0x0C00 && c < 0x0FE0) M[c - 0x28 * rnd(2)] = [0x20, 0x60, 0x61, 0x62, 0x6C, 0x6E, 0x70, 0x72, 0x74, rnd(256)][rnd(10)];
  }
} });
check({ name: 'bullet_stop' });
check({ name: 'tex_death', cases: 3000, setup: (M, rnd) => {
  nudge(M, rnd, 'menu_on', 'game_ended', 'dying'); M[Z.tex_hit] = rnd(4) ? 1 : 0; M[Z.sink_timer] = 1 + rnd(2);
  M[Z.sink_steps] = [1, 2, 0x18][rnd(3)]; M[Z.lives] = rnd(4); cell(M, rnd);
  M[T.digit_dec] = rnd(4) ? 0xCE : 0xAD; M[T.lives_dec] = rnd(4) ? 0xC6 : 0xA5;
} });
check({ name: 'turn_tex' });
check({ name: 'sink_tex', setup: (M, rnd) => { M[Z.sink_steps] = rnd(0x18); } });
check({ name: 'clear_play_area' });
