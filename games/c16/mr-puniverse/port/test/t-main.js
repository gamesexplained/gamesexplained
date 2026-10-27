'use strict';
// The main program's routines that do not wait, the panel, the title and the pointers, against
// the game's (lib.js). new_game, start_turn, room_start, main_loop and death wait, and are held to
// the game by the lockstep (lockstep.js).
const { check } = require('./lib.js');
const { Z, T } = globalThis.PuniPort;
const KILLED = 0x25C5;
// clock_tick leaves through j_25C5 (PLA, PLA, JMP death): 'death', or nothing with the RTS poked there
const killed = (res, cpu, MG) => {
  const want = cpu.stoppedAt === KILLED && MG[KILLED] !== 0x60 ? 'death' : undefined;
  return res === want ? null : 'the port went to ' + res + ' where the game went to ' + want;
};

check({ name: 'setup_machine', cases: 50 });
check({ name: 'clear_play_area', cases: 20 });
check({ name: 'draw_lives', cases: 500, setup: (M, rnd) => { M[T.lives] = rnd(10); M[T.lives + 1] = rnd(10); } });
check({ name: 'draw_lives_row', cases: 500, setup: (M, rnd) => { M[0x49] = rnd(12); return { x: rnd(2) * 0x50 }; } });
for (const name of ['show_get_ready', 'show_game_over', 'show_menu', 'print_title_text', 'rotate_vitamin_chars', 'death_sound',
  'voice1_on_unused', 'voice1_off_unused', 'voice2_on', 'voice2_off']) check({ name, cases: 50 });
check({ name: 'delay', cases: 50, setup: (M, rnd) => ({ y: rnd(256) }), outs: ['x', 'y'] });
check({ name: 'title_dot_step', cases: 3000, setup: (M, rnd) => {
  M[0x4D] = 1 + rnd(3); M[0x4F] = 1 + rnd(3); M[0x4E] = rnd(2) ? 0xD7 : 0xD6;
  M[0x4C] = rnd(3) ? 0xFF : rnd(0x60);
  const a = 0x0C00 + rnd(0x2D0); M[0x4A] = a & 0xFF; M[0x4B] = a >> 8;
  M[0x49] = rnd(16) << 4;
} });
check({ name: 'energy_tick', cases: 4000, outs: ['c'], setup: (M, rnd) => {
  M[0x33AB] = rnd(4) ? 0xCE : 0xAD;
  M[T.energy_count] = rnd(3); M[T.energy_rate] = rnd(256); M[T.energy_mode] = rnd(3) ? 0 : 1;
  M[T.bar_pos] = rnd(4) ? rnd(0x22) : [0, 0x21, 0xFF][rnd(3)];
  for (let x = 0; x < 0x22; x++) M[T.egy_bar + x] = 0x6D + rnd(5);
} });
check({ name: 'clock_tick', cases: 4000, stopAt: KILLED, result: killed, setup: (M, rnd) => {
  M[KILLED] = rnd(4) ? 0x68 : 0x60;
  M[T.player] = rnd(2); M[T.clock_count] = rnd(3);
  const x = M[T.player] ? 0x55 : 0x05;
  for (const d of [0, 2, 5]) M[0x0EFE + x - d] = 0x25 + (rnd(4) ? rnd(10) : 9);
  if (rnd(4) === 0) M[0x0EFE + x - 5] = 0x28;
} });
check({ name: 'draw_clock_digit', cases: 500, setup: (M, rnd) => ({ a: 0x25 + rnd(10), x: rnd(0x58) }) });
check({ name: 'vitamin_count_up', cases: 2000, setup: (M, rnd) => {
  M[T.player] = rnd(2);
  for (let x = 0; x < 6; x += 2) for (const p of [0, 0x50]) M[0x0F0E + p + x] = 0x25 + (rnd(3) ? rnd(10) : 9);
} });
check({ name: 'draw_big_digit', cases: 500, setup: (M, rnd) => ({ a: 0x25 + rnd(10), x: rnd(0x58) }) });
check({ name: 'refill_energy', cases: 300, setup: (M, rnd) => {
  M[T.bar_pos] = rnd(0x22);
  for (let x = 0; x < 0x22; x++) M[T.egy_bar + x] = 0x6E + rnd(4);
} });
check({ name: 'add_to_ptr43', cases: 2000, outs: ['c'], setup: (M, rnd) => { M[0x43] = rnd(256); M[0x44] = rnd(256); return { a: rnd(256) }; } });
for (const name of ['colour_ptr', 'ptr_down', 'ptr_right', 'ptr_up', 'ptr_left']) {
  check({ name, cases: 2000, outs: ['c'], setup: (M, rnd) => {
    const x = [0x3F, 0x4A, 0x4C, 0x4D][rnd(4)];
    const a = rnd(3) ? 0x0C00 + rnd(0x400) : rnd(0x10000);
    M[x] = a & 0xFF; M[x + 1] = a >> 8;
    return { x };
  } });
}
