'use strict';
// The player's routines, against the game's (lib.js): the pass with what he touches, the moves,
// the floor, the switches, the exits, the vitamin and his figure. The pause and the 25th vitamin
// wait for keys, and are held to the game by the lockstep (lockstep.js).
const { check } = require('./lib.js');
const { Z, T } = globalThis.PuniPort;
const u = T.under_player;
const DEATH = 0x32D0, ROOM_START = 0x32A5, KILLED = 0x25C5;
const where = { [DEATH]: 'death', [ROOM_START]: 'room_start', [KILLED]: 'kill' };
const went = (res, cpu) => {
  const want = where[cpu.stoppedAt];
  return res === want ? null : 'the port went to ' + res + ' where the game went to ' + want;
};
// the player somewhere on the screen, as he can be: facing either way, at any step and line
function player(M, rnd) {
  M[Z.player_x] = (rnd(2) << 4) | (rnd(4) << 2);
  M[Z.player_y] = rnd(4) * 2;
  if (rnd(3) === 0) { const a = 0x0C29 + rnd(0x260); M[Z.block_ptr] = a & 0xFF; M[Z.block_ptr + 1] = a >> 8; }
}
const CELLS = [0x7E, 0x80, 0x88, 0xA0, 0xA8, 0xAA, 0xB0, 0xB5, 0xB6, 0xB7, 0xB8, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF, 0xC0,
  0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC8, 0xCA, 0xCB, 0xCC, 0xD0, 0xD5, 0xD6, 0xD6, 0xD6, 0xD7];
const cell = rnd => (rnd(4) ? CELLS[rnd(CELLS.length)] : rnd(256));
function controls(M, rnd) {
  M[T.keyboard] = rnd(2);
  M[Z.key_code] = [0x40, 0x17, 0x0C, 0x25, 0x24, rnd(0x40)][rnd(6)];
  if (M[Z.key_code] === 0x29 || M[Z.key_code] === 0x12) M[Z.key_code] = 0x40;
  M[T.shift_flag] = rnd(3) ? 0 : 1 + rnd(7);
}
// the cells around his feet, and the jump
function ground(M, rnd) {
  const bp = M[Z.block_ptr] | M[Z.block_ptr + 1] << 8;
  for (const d of [0x77, 0x78, 0x79, 0x7A]) if (rnd(2)) M[(bp + d) & 0x3FFF] = cell(rnd);
  for (let i = 0; i < 6; i++) if (rnd(4) === 0) M[u + i] = cell(rnd);
  M[T.jumping] = rnd(3) ? 0 : 1;
  M[T.jump_count] = rnd(2) ? rnd(0x11) : 0x80 + rnd(0x11);
  M[0x2172] = rnd(4) ? 0x38 : 0x39;
}

check({ name: 'player_pass', cases: 6000, stopAt: [DEATH, ROOM_START], result: went, setup: (M, rnd) => {
  player(M, rnd); controls(M, rnd); ground(M, rnd);
  if (rnd(20) === 0) M[Z.key_code] = 0x12;
  M[KILLED] = rnd(4) ? 0x68 : 0x60;
  const p = M[T.player];
  M[T.vitamin_count + p] = rnd(0x17);
  const l = (M[Z.player_x] & 0x10) ? 3 : 0;
  if (rnd(2)) M[u + l + 1] = cell(rnd);
  if (rnd(2)) M[u + l + 2] = cell(rnd);
} });
check({ name: 'player_move', cases: 6000, stopAt: KILLED, result: went, setup: (M, rnd) => {
  player(M, rnd); controls(M, rnd); ground(M, rnd);
} });
check({ name: 'read_input', cases: 2000, setup: controls });
for (const name of ['move_right', 'move_left', 'move_up', 'move_down', 'shift_block_right', 'shift_block_left']) {
  check({ name, cases: 3000, outs: name === 'move_down' ? ['c', 'y'] : name === 'move_right' ? [] : ['y'], setup: (M, rnd) => {
    player(M, rnd); ground(M, rnd);
    return { y: rnd(256) };
  } });
}
check({ name: 'is_solid', cases: 2000, outs: ['c'], setup: (M, rnd) => ({ a: rnd(256) }) });
check({ name: 'crumble_step', cases: 3000, outs: ['y'], setup: (M, rnd) => { player(M, rnd); M[0x4B] = 0xA8 + rnd(0x10); } });
check({ name: 'crumble_redraw', cases: 3000, outs: ['y'], setup: (M, rnd) => { player(M, rnd); M[0x4B] = 0xA8 + rnd(0x12); M[0x4C] = rnd(2); } });
for (const name of ['switch_off', 'switch_on']) {
  check({ name, cases: 2000, setup: (M, rnd) => { player(M, rnd); return { a: rnd(2) ? [0xBD, 0xBE, 0xBF, 0xC0][rnd(4)] : rnd(256) }; } });
}
for (const name of ['draw_switch_off', 'draw_switch_on']) check({ name, cases: 1000, outs: ['y'], setup: player });
check({ name: 'leave_room', cases: 2000, stopAt: ROOM_START, result: (res, cpu) => went(res, cpu), setup: (M, rnd) => {
  player(M, rnd); M[T.player] = rnd(2);
  for (let i = 0; i < 4; i++) M[T.exit_up + i] = rnd(25);
  return { a: 0xC1 + rnd(4) };
} });
check({ name: 'collect_vitamin', cases: 2000, setup: (M, rnd) => {
  player(M, rnd); M[T.player] = rnd(2); M[T.vitamin_id] = rnd(25);
  M[T.vitamin_count + M[T.player]] = rnd(0x17);
  for (let x = 0; x < 6; x += 2) for (const p of [0, 0x50]) M[0x0F0E + p + x] = 0x25 + (rnd(3) ? rnd(10) : 9);
} });
check({ name: 'player_cell', cases: 1000, outs: ['y'], setup: (M, rnd) => ({ a: rnd(2) ? 0x78 + rnd(6) : rnd(256) }) });
for (const name of ['save_under_player', 'draw_player', 'copy_under_glyphs']) check({ name, cases: 1000, setup: player });
check({ name: 'glyph_addr', cases: 1000, setup: (M, rnd) => { M[0x43] = rnd(256); M[0x44] = rnd(256); } });
check({ name: 'merge_player', cases: 3000, setup: (M, rnd) => { player(M, rnd); for (let i = 0; i < 0x30; i++) if (rnd(3) === 0) M[T.glyph_buffer + i] = rnd(256); } });
for (const name of ['shift_scenery_bit', 'shift_figure_bit']) {
  check({ name, cases: 500, setup: (M, rnd) => { for (const a of [0x43, 0x44, 0x4B, 0x4C]) M[a] = rnd(256); } });
}
check({ name: 'animate_chars', cases: 3000, setup: (M, rnd) => { player(M, rnd); M[T.anim_phase] = rnd(4) ? rnd(3) : rnd(256); } });
