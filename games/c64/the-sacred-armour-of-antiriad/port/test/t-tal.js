'use strict';
// Tal's routines (src/g-tal.js), each checked alone against the game's (check.js), on the moments
// of play.
//   node t-tal.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 300), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
const FOOT = [0x80, 0x82, 0x84, 0x86, 0x88, 0x8A, 0x8C, 0x8E, 0x90, 0x92, 0x98, 0x9E, 0xA0, 0xA2, 0xA4];
const SUIT = [0xAC, 0xAE, 0xB0, 0xB2, 0xB4, 0xB6];
const pick = (rnd, a) => a[rnd(a.length)];
// Tal on foot or in the suit, in any of his animations, the stick anywhere, his state at the edges
// of its tests
function tal(M, c, rnd) {
  c.game.joy = 0x1F & ~rnd(32);
  if (rnd(3)) {
    const suit = rnd(2);
    const a = pick(rnd, suit ? SUIT : FOOT);
    M[0x0260] = a; M[0x0261] = a + 1;
    M[0x7B] = suit ? (rnd(4) ? 0x80 : 0x00) : (rnd(4) ? 0x00 : 0x80);
  }
  if (rnd(2)) M[0x66] = rnd(2) ? 0 : rnd(8);
  for (const a of [0x0290, 0x02A8, 0x6D, 0xB0, 0xB1, 0x7E, 0x0680, 0x067E, 0xA7, 0x0262, 0x88]) if (!rnd(3)) M[a] = rnd(2) ? 0x80 : 0;
  if (!rnd(3)) M[0x80] = rnd(4);
  if (!rnd(3)) M[0x81] = rnd(4);
  if (!rnd(3)) M[0x02C8] = rnd(16);
  if (!rnd(3)) M[0x4F] = rnd(3) ? rnd(12) : rnd(32);
  if (!rnd(3)) M[0x5B] = rnd(20);
  if (!rnd(3)) M[0x93] = rnd(2) ? 0 : rnd(100);
  if (!rnd(3)) M[0x68] = rnd(2) ? 0 : rnd(10);
  if (!rnd(3)) M[0x0355] = pick(rnd, [0x8A, 0x8B, 0x90]);
  if (!rnd(3)) M[0x0356] = pick(rnd, [0x9B, 0x90]);
  if (!rnd(3)) M[0x0200] = pick(rnd, [0x10, 0x20, 0xF0, 0x80]);
  return {};
}
const T = ['tal_control', 'foot_control', 'foot_stop', 'foot_up', 'foot_down', 'foot_left', 'foot_right', 'foot_fire',
  'start_jump', 'foot_hold_still', 'start_tal_anim', 'suit_control', 'suit_coast', 'suit_up', 'suit_down', 'suit_left',
  'suit_right', 'suit_sound_fast', 'suit_sound_slow', 'suit_vertical', 'suit_accel_up', 'suit_accel_down',
  'suit_speed_left', 'suit_speed_right', 'leave_armour', 'suit_fire', 'suit_drift'].map(name => ({ name, setup: tal }));
// Tal somewhere near the scenery: his sprites on the chip where the shadows have them, give or take
function near(M, c, rnd) {
  tal(M, c, rnd);
  if (rnd(2)) { M[0x0201] = 0x20 + rnd(0x80); M[0x0203] = (M[0x0201] + 0x15) & 255; }
  if (rnd(2)) M[0x0200] = rnd(256);
  if (!rnd(3)) M[0x6C] = rnd(0x15);
  if (!rnd(3)) M[0x45] = rnd(2) ? 0x80 : rnd(5);
  c.vic[0x00] = M[0x0200]; c.vic[0x01] = M[0x0203] - (rnd(2) ? 0 : rnd(8)); c.vic[0x10] = M[0x0210] & 1 ? 0x03 : 0x00;
  if (!rnd(4)) M[0x85] = rnd(256);
  return {};
}
for (const name of ['tal_terrain', 'jump_rise', 'fall', 'walk_off_edge', 'foot_left_wall', 'foot_right_wall', 'suit_up_wall',
  'suit_down_floor', 'suit_left_wall', 'suit_right_wall', 'wall_left', 'wall_right', 'barrier_left', 'barrier_right',
  'check_floor', 'check_head', 'snap_to_row']) T.push({ name, setup: near });
// Tal dead, rising, dying, landed by a detonator or hovering
function lives(M, c, rnd) {
  near(M, c, rnd);
  const k = rnd(6);
  if (k < 3) { const a = [0xA8, 0xAA, 0xA6][k]; M[0x0260] = a; M[0x0261] = a + 1; }
  if (k === 3) { M[0x0260] = 0xB2; M[0x0261] = 0xB3; M[0xB1] &= rnd(2) ? 0x7F : 0xFF; }
  if (rnd(2)) M[0x0203] = (M[0x0201] + (rnd(2) ? 0 : 0x15)) & 255;
  if (!rnd(3)) M[0x0202] = rnd(256);
  for (const a of [0x90, 0x8E]) if (!rnd(3)) M[a] = rnd(2) ? 0 : rnd(4);
  if (!rnd(3)) M[0x51] = rnd(2) ? 0 : rnd(3) ? 0x1F : rnd(32);
  if (!rnd(3)) M[0xAC] = rnd(6);
  if (!rnd(3)) M[0x02F8] = rnd(2) ? 0 : 1;
  if (!rnd(3)) M[0x5B] = 0;
  if (!rnd(4)) M[0x0681] ^= 0x80;
  if (!rnd(3)) c.colour[0x063] = rnd(16);
  return {};
}
for (const name of ['tal_lives', 'check_death', 'suit_hover', 'power_centre', 'check_detonation']) T.push({ name, setup: lives });
T.push({ name: 'tal_cell', outs: ['a', 'x', 'y'], setup: near });
T.push({ name: 'tal_cell_from_y0', outs: ['a', 'x', 'y'], setup: near });
T.push({ name: 'play_effect', outs: ['a'], setup: (M, c, rnd) => { tal(M, c, rnd); return { a: rnd(256) }; } });
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
