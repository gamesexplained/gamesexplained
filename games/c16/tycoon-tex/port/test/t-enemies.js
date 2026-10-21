'use strict';
// The enemies, their bombs, the breaks they make and the explosion, against the game's (lib.js).
const { check } = require('./lib.js');
const { Z } = globalThis.TexPort;
const nudge = (M, rnd, ...names) => { for (const n of names) if (rnd(3) === 0) M[Z[n]] = [0, 1, 2, rnd(256)][rnd(4)]; };
const rnds = (M, rnd) => { for (let a = Z.rnd0; a <= Z.rnd3; a++) M[a] = rnd(256); };
const mask = (M, rnd) => { if (rnd(2)) M[Z.enemy_mask] = rnd(0x20); };
check({ name: 'move_arrow_and_jet', cases: 4000, setup: (M, rnd) => {
  rnds(M, rnd); mask(M, rnd);
  nudge(M, rnd, 'menu_on', 'paused', 'arrow_active', 'jet_active', 'arrow_timer', 'jet_timer', 'jet_bomb_falling', 'jet_bomb_timer');
  M[Z.spawn_threshold] = [0xB0, 0x80, 0x40, 0x01][rnd(4)];
} });
check({ name: 'drop_jet_bomb', setup: (M, rnd) => { nudge(M, rnd, 'jet_bomb_falling'); } });
check({ name: 'move_jet_bomb', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'jet_bomb_falling'); M[Z.jet_bomb_rows] = rnd(12); } });
check({ name: 'end_jet_bomb', cases: 2000, setup: (M, rnd) => { mask(M, rnd); nudge(M, rnd, 'shot_down'); } });
check({ name: 'draw_arrow', setup: (M, rnd) => { nudge(M, rnd, 'arrow_moved', 'arrow_gone'); } });
check({ name: 'draw_jet', setup: (M, rnd) => { nudge(M, rnd, 'jet_moved', 'jet_gone', 'jet_bomb_moved'); } });
check({ name: 'draw_jet_bomb' });
check({ name: 'move_bombs', cases: 4000, setup: (M, rnd) => {
  rnds(M, rnd); mask(M, rnd);
  nudge(M, rnd, 'bouncy_active', 'explosive_active', 'bouncy_timer', 'explosive_timer', 'bouncy_down', 'explosive_flight');
  M[Z.spawn_threshold] = [0xB0, 0x80, 0x40, 0x01][rnd(4)]; M[Z.bouncy_steps] = rnd(12); M[Z.bouncy_height] = rnd(8);
} });
check({ name: 'clear_enemies', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'arrow_active', 'jet_active', 'bouncy_active', 'explosive_active', 'jet_bomb_falling'); } });
check({ name: 'draw_bouncy_bomb', setup: (M, rnd) => { nudge(M, rnd, 'bouncy_moved', 'bouncy_gone'); } });
check({ name: 'move_bouncy_bomb', cases: 4000, setup: (M, rnd) => {
  rnds(M, rnd); nudge(M, rnd, 'bouncy_active', 'bouncy_timer', 'bouncy_down'); M[Z.bouncy_steps] = rnd(12); M[Z.bouncy_height] = rnd(8);
  M[Z.spawn_threshold] = [0xB0, 0x80, 0x40, 0x01][rnd(4)];
} });
check({ name: 'break_pipe', cases: 3000, setup: (M, rnd) => {
  const c = 0x0F48 + rnd(0x27) - 0x28 * rnd(2);
  if (rnd(2)) M[c + 0x4B + rnd(10)] = 0xD7 + rnd(0x13);
  M[Z.pressure_cells] = rnd(26); M[Z.pressure_fine] = rnd(8); nudge(M, rnd, 'pressure_gone');
  return { x: c & 0xFF, y: c >> 8 };
} });
check({ name: 'move_explosive', cases: 4000, setup: (M, rnd) => {
  rnds(M, rnd); nudge(M, rnd, 'explosive_active', 'explosive_timer', 'explosive_flight', 'shot_down'); M[Z.explosive_row] = rnd(8);
  M[Z.spawn_threshold] = [0xB0, 0x80, 0x40, 0x01][rnd(4)];
} });
check({ name: 'explosive_lands', cases: 2000, setup: (M, rnd) => { rnds(M, rnd); nudge(M, rnd, 'shot_down'); } });
check({ name: 'draw_explosive', setup: (M, rnd) => { nudge(M, rnd, 'explosive_moved', 'explosive_gone'); } });
check({ name: 'start_explosion', setup: (M, rnd) => { const c = 0x0D40 + rnd(0x230); return { x: c & 0xFF, y: c >> 8 }; } });
check({ name: 'tick_explosion', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'paused', 'exploding', 'explosion_timer'); M[Z.explosion_step] = rnd(9); } });
check({ name: 'draw_explosion', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'explosion_shown'); M[Z.explosion_step] = rnd(9); } });
