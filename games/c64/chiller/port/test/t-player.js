'use strict';
// The player group checked routine by routine against the game's own code:
// node games/c64/chiller/port/test/t-player.js
const { check } = require('./lib.js');
const G = ['player'];
// node t-player.js name,name runs only those
const only = process.argv[2] ? process.argv[2].split(',') : null;
const run = o => (!only || only.includes(o.name)) && check(o);
const pick = (rnd, list) => list[rnd(list.length)];

// The boy's sprite somewhere on the playfield, now and then at an edge of move_sprite's box.
function boy(M, c, rnd) {
  if (rnd(3) === 0) c.vic[0] = pick(rnd, [0, 1, 7, 8, 9, 0x0B, 0x0C, 0x0D, 0x4E, 0x4F, 0x50, 0xFF]);
  else if (rnd(2)) c.vic[0] = rnd(256);
  if (rnd(3) === 0) c.vic[1] = pick(rnd, [0x32, 0x33, 0xE2, 0xE3]);
  else if (rnd(2)) c.vic[1] = 0x32 + rnd(0xE3 - 0x32 + 1);
  if (rnd(2)) c.vic[0x10] = (c.vic[0x10] & 0xFE) | rnd(2);
}
// The level's switches the jump and walk routines read.
function flags(M, rnd) {
  if (rnd(2)) M[0x45FF] = rnd(2);
  if (rnd(2)) M[0xC19C] = rnd(2);
  if (rnd(2)) M[0xC19B] = rnd(2);
  if (rnd(2)) M[0x534E] = pick(rnd, [0, 0, 1, 5, 0x18]);
  if (rnd(2)) M[0x450D] = rnd(2);
  if (rnd(2)) M[0xCF06] = rnd(3);
  if (rnd(2)) { M[0x450C] = 1 + rnd(4); M[0xCF07] = rnd(5); }
  if (rnd(2)) M[0x5980] = pick(rnd, [0x60, 0xAD]);
  if (rnd(2)) M[0xC84D] = pick(rnd, [0x60, 0xA9]);
  if (rnd(2)) M[0x07F8] = 0xD8 + rnd(16);
  if (rnd(3) === 0) M[0x07F8] = rnd(256);
  if (rnd(2)) M[0x2A0C] = pick(rnd, [0x2C, 0x30]);
}
// The keyboard, SHIFT and the stick.
function controls(M, c, rnd) {
  M[0xC5] = rnd(2) ? 0x40 : pick(rnd, [M[0x4512], M[0x4513], M[0x4514], M[0x4515], rnd(64)]);
  M[0x028D] = rnd(3) === 0 ? rnd(8) : 0;
  c.game.joy = rnd(2) ? 0x1F : (0x10 | rnd(16));
  if (rnd(4) === 0) c.game.joy = rnd(32);
  M[0x4511] = rnd(2);
  if (rnd(2)) { M[0xC1EC] = pick(rnd, [0, 1, 0xFF]); M[0xC1ED] = pick(rnd, [0, 1, 0xFF]); }
  if (rnd(2)) M[0xC1EE] = rnd(2);
}

const R = (lo, hi) => [lo, hi];

run({ name: 'move_sprite', groups: G, cases: 6000, range: R(0xC900, 0xC999), outs: ['a', 'x', 'y', 'z', 'c', 'n'],
  setup: (M, c, rnd) => {
    const x = rnd(8);
    if (rnd(2)) c.vic[1 + 2 * x] = pick(rnd, [0x32, 0xE3, rnd(256)]);
    if (rnd(2)) c.vic[2 * x] = pick(rnd, [8, 0x4F, 0xFF, 0, rnd(256)]);
    c.vic[0x10] = rnd(256);
    return { a: rnd(8) === 0 ? rnd(256) : rnd(4), x: rnd(20) === 0 ? rnd(128) : x };
  } });
run({ name: 'try_move', groups: G, cases: 6000, range: R(0x2A00, 0x2A6E),
  setup: (M, c, rnd) => { boy(M, c, rnd); flags(M, rnd); return { a: rnd(4) }; } });
run({ name: 'b_2A29', groups: G, cases: 3000, range: R(0x2A29, 0x2A6E),
  setup: (M, c, rnd) => { M[0x2AFE] = rnd(4); return { a: rnd(256), y: rnd(25) }; } });
run({ name: 'j_2A57', groups: G, cases: 3000, range: R(0x2A57, 0x2A5F),
  setup: (M, c, rnd) => { boy(M, c, rnd); M[0x2AFE] = rnd(4); } });
run({ name: 'jump_setup', groups: G, cases: 2000, range: R(0x2A72, 0x2A7B),
  setup: (M, c, rnd) => { flags(M, rnd); return { a: rnd(2) }; } });
run({ name: 's_2D8D', groups: G, cases: 2000, range: R(0x2D8D, 0x2D95), outs: ['a', 'x', 'y', 'z'] });
run({ name: 'second_player_in', groups: G, cases: 2000, range: R(0x2F00, 0x2F15), outs: ['a', 'x', 'y', 'z', 'c'] });
run({ name: 'fall_step', groups: G, cases: 6000, range: R(0x5350, 0x538C),
  setup: (M, c, rnd) => {
    boy(M, c, rnd); flags(M, rnd);
    M[0x45FF] = rnd(4) ? 1 : 0; M[0x534C] = rnd(3) ? 1 : rnd(256); M[0x549F] = rnd(2);
  } });
run({ name: 'jump_step', groups: G, cases: 8000, range: R(0x538E, 0x53EC),
  setup: (M, c, rnd) => {
    boy(M, c, rnd); flags(M, rnd);
    M[0xC19C] = rnd(4) ? 1 : 0; M[0x2A7F] = rnd(3) ? 1 : rnd(256);
    M[0x2A7E] = pick(rnd, [0, 1, 2, 0x17, 0x18, rnd(0x18)]);
    M[0x534C] = rnd(3) ? 1 : rnd(256); M[0x549F] = rnd(2);
  } });
run({ name: 'land', groups: G, cases: 2000, range: R(0x53EF, 0x540B), outs: ['a', 'x', 'y', 'z'],
  setup: (M, c, rnd) => { M[0x534E] = rnd(256); } });
run({ name: 'start_jump', groups: G, cases: 3000, range: R(0x5418, 0x5425),
  setup: (M, c, rnd) => { flags(M, rnd); } });
run({ name: 'remember_y', groups: G, cases: 2000, range: R(0x542B, 0x5434), outs: ['a', 'x', 'y', 'z'],
  setup: (M, c, rnd) => { M[0xC19B] = rnd(2); } });
run({ name: 'rise_blocked', groups: G, cases: 2000, range: R(0x5437, 0x5447),
  setup: (M, c, rnd) => { M[0x542A] = rnd(2) ? c.vic[1] : rnd(256); } });
run({ name: 'fall_blocked', groups: G, cases: 4000, range: R(0x5467, 0x5480),
  setup: (M, c, rnd) => { boy(M, c, rnd); flags(M, rnd); } });
run({ name: 'jump_sound', groups: G, cases: 2000, range: R(0x5483, 0x549C), setup: (M, c, rnd) => { flags(M, rnd); } });
run({ name: 'fall_sound_off', groups: G, cases: 2000, range: R(0x54A0, 0x54A8) });
run({ name: 'fall_sound', groups: G, cases: 4000, range: R(0x54AC, 0x54E4),
  setup: (M, c, rnd) => { flags(M, rnd); M[0x549F] = rnd(2); M[0x54C0] = rnd(256); M[0x54BF] = rnd(256); return { x: rnd(0x10) }; } });
run({ name: 'jump_sound_freq', groups: G, cases: 2000, range: R(0x54EA, 0x54F4), setup: (M, c, rnd) => { flags(M, rnd); } });
run({ name: 'jump_pitch_rise', groups: G, cases: 2000, range: R(0x54FC, 0x5513), outs: ['a', 'x', 'y', 'z', 'n', 'c'],
  setup: (M, c, rnd) => { M[0x54F9] = rnd(256); M[0x54FA] = rnd(256); } });
run({ name: 'jump_pitch_fall', groups: G, cases: 2000, range: R(0x5518, 0x552F), outs: ['a', 'x', 'y', 'z', 'n', 'c'],
  setup: (M, c, rnd) => { M[0x54F9] = rnd(256); M[0x54FA] = rnd(256); } });
run({ name: 'gravity_setup', groups: G, cases: 2000, range: R(0x5651, 0x565E), setup: (M, c, rnd) => { M[0x45FF] = rnd(2); } });
run({ name: 'idle_frame', groups: G, cases: 4000, range: R(0x5844, 0x587F), outs: ['a', 'x', 'y', 'z', 'c'],
  setup: (M, c, rnd) => {
    if (rnd(2)) {                                  // the girl's frame numbers, as player_swap sets them
      M[0x5848] = 0xF1; M[0x584C] = 0xF6; M[0x5876] = 0xF2; M[0x587B] = 0xF6;
    }
    M[0x07F8] = rnd(2) ? M[0x5848] : (rnd(2) ? 0xD8 + rnd(24) : rnd(256));
    if (rnd(2)) M[0x5A02] = c.vic[0];
    M[0x5A03] = rnd(2) ? 0x8F : rnd(256);
  } });
run({ name: 'jump_lockout', groups: G, cases: 3000, range: R(0x5880, 0x58B0),
  setup: (M, c, rnd) => {
    flags(M, rnd);
    if (rnd(2)) { M[0x589B] = 0xF0; M[0x58A4] = 0xF1; M[0x58A9] = 0xF0; }
    M[0x07F8] = rnd(256);
  } });
run({ name: 'frame_step', groups: G, cases: 3000, range: R(0x5980, 0x5997), outs: ['a', 'x', 'y', 'z', 'n', 'c'],
  setup: (M, c, rnd) => { M[0x5980] = rnd(3) ? 0xAD : 0x60; M[0x07F8] = rnd(256); return { z: rnd(2), n: rnd(2) }; } });
run({ name: 'tick_border', groups: G, cases: 8000, range: R(0x75B0, 0x75C7),
  setup: (M, c, rnd) => {
    boy(M, c, rnd); flags(M, rnd);
    M[0x5A11] = rnd(3) ? 0 : rnd(256); M[0x5A08] = rnd(2);
    M[0x2A7F] = rnd(3) ? 1 : rnd(256); M[0x534C] = rnd(3) ? 1 : rnd(256);
    M[0x5A16] = rnd(3) ? 1 : rnd(256);
  } });
run({ name: 'j_75E0', groups: G, cases: 2000, range: R(0x75E0, 0x75EC),
  setup: (M, c, rnd) => { if (rnd(3)) c.colour[0x25C] = rnd(2) ? 1 : rnd(16); } });
run({ name: 'set_boy_msb', groups: G, cases: 2000, range: R(0x7EF1, 0x7EFF), setup: (M, c, rnd) => ({ a: rnd(2) }) });
run({ name: 'set_boy_x', groups: G, cases: 2000, range: R(0x7F20, 0x7F26) });
run({ name: 'set_boy_y', groups: G, cases: 2000, range: R(0x7F27, 0x7F2D) });
run({ name: 'set_boy_xmsb', groups: G, cases: 2000, range: R(0x7F2E, 0x7F34), setup: (M, c, rnd) => ({ a: rnd(2) }) });
run({ name: 'colour_cycle', groups: G, cases: 3000, range: R(0x7F80, 0x7FAD), outs: ['a', 'x', 'y', 'z'],
  setup: (M, c, rnd) => { M[0x5A16] = rnd(2) ? 1 : rnd(256); } });
run({ name: 'jump_colour_step', groups: G, cases: 4000, range: R(0x7FAE, 0x7FB4),
  setup: (M, c, rnd) => { boy(M, c, rnd); flags(M, rnd); M[0x5A16] = rnd(2) ? 1 : rnd(256); M[0x2A7F] = rnd(2) ? 1 : 5; } });
run({ name: 'fire_pressed', groups: G, cases: 6000, range: R(0xC19D, 0xC1BA),
  setup: (M, c, rnd) => {
    boy(M, c, rnd); flags(M, rnd);
    c.vic[0x15] = rnd(256);
    if (rnd(2)) M[0x4508 + rnd(8)] = 0xFF;
  } });
run({ name: 'joy_move', groups: G, cases: 4000, range: R(0xC700, 0xC718), outs: ['a', 'x', 'y', 'z', 'c'],
  setup: (M, c, rnd) => {
    M[0x07F9] = rnd(2) ? 0xE0 + rnd(4) : rnd(256);
    if (rnd(2)) c.vic[3] = pick(rnd, [0x32, 0xE3]);
    if (rnd(2)) c.vic[2] = pick(rnd, [8, 0x4F, 0xFF, 0]);
    c.vic[0x10] = rnd(256);
  } });
run({ name: 'player_input', groups: G, cases: 10000, show: +(process.env.SHOW || 3), range: R(0xC71B, 0xC7D1),
  setup: (M, c, rnd) => {
    boy(M, c, rnd); flags(M, rnd); controls(M, c, rnd);
    for (let i = 0; i < 8; i++) if (rnd(2)) M[0x4500 + i] = rnd(2);
    if (rnd(2)) { M[0xC79C] = 0xE0; M[0xC7C6] = 0xE0; }
    c.vic[0x15] = rnd(256);
  } });
run({ name: 'switch_check', groups: G, cases: 4000, range: R(0xC7D4, 0xC816),
  setup: (M, c, rnd) => {
    flags(M, rnd); c.vic[0x10] = rnd(256);
    if (rnd(2)) M[0x4508 + rnd(12)] = 0xFF;
    return { a: rnd(256) };
  } });
run({ name: 'walk_frame', groups: G, cases: 4000, range: R(0xC819, 0xC83F), outs: ['a', 'x', 'y', 'z', 'c'],
  setup: (M, c, rnd) => { flags(M, rnd); } });
run({ name: 'read_controls', groups: G, cases: 8000, range: R(0xC84D, 0xC8EF), outs: ['a', 'x', 'y', 'z', 'c'],
  setup: (M, c, rnd) => { flags(M, rnd); controls(M, c, rnd); if (rnd(3)) M[0xC84D] = 0xA9; return { z: rnd(2), n: rnd(2) }; } });
run({ name: 'read_stick', groups: G, cases: 4000, range: R(0xC9C4, 0xC9DE), outs: ['a', 'x', 'y', 'z', 'n'],
  setup: (M, c, rnd) => { controls(M, c, rnd); } });
