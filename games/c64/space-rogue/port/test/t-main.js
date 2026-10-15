'use strict';
// The main group's routines alone against the game's (check.js).
const { check } = require('./check.js');
const KEYS = [0, 1, 2, 7, 8, 10, 13, 14, 15, 17, 20, 23, 33, 36, 39, 47, 52, 57, 60, 63];
const keyboard = (M, c, rnd) => {
  c.game.keys = new Set(rnd(3) ? [KEYS[rnd(KEYS.length)]] : []);
  if (rnd(3) === 0) c.game.keys.add(rnd(2) ? 15 : 52);       // a SHIFT
  if (rnd(4) === 0) c.game.keys.add(58);                    // CTRL
  c.game.joy = 0x1F & ~[0, 0, 1, 2, 4, 8, 16, 5][rnd(8)];
  M[0x10] = rnd(3) ? M[0x10] : rnd(80); M[0x11] = rnd(4) ? rnd(3) : M[0x11]; M[0x12] = rnd(3) ? 1 + rnd(2) : M[0x12];
  M[0x03] = rnd(4); M[0x04] = 2;
};
let f = 0;
const t = o => { f += check(o).fails ? 1 : 0; };
t({ name: 'random', outs: ['a', 'c'] });
t({ name: 'random_upto', setup: (M, c, rnd) => ({ a: rnd(256) }), outs: ['a', 'y'] });
t({ name: 'random_word', setup: (M, c, rnd) => { M[0x60] = rnd(256); M[0x61] = rnd(4) ? rnd(4) : rnd(256); }, outs: [] });
t({ name: 'random_seed', outs: ['a', 'y'] });
t({ name: 'keyscan', port: 0x35, setup: keyboard, outs: ['a'] });
t({ name: 'keyscan_to_buffer', port: 0x35, setup: keyboard, outs: [] });
t({ name: 'get_key', setup: (M, c, rnd) => { M[0x03] = rnd(4); for (let i = 5; i < 9; i++) M[i] = rnd(256); }, outs: ['a', 'c'] });
t({ name: 'key_direction', setup: (M, c, rnd) => { keyboard(M, c, rnd); M[0x03] = rnd(3); for (let i = 5; i < 9; i++) M[i] = [0x57, 0x41, 0x0D, 0x20, 0x31, rnd(256)][rnd(6)]; M[0x0D03] = rnd(2); }, outs: ['a', 'x', 'y', 'c'] });
t({ name: 's_A3B3', setup: (M, c, rnd) => { keyboard(M, c, rnd); M[0xA404] = rnd(128); M[0xA405] = rnd(128); return { a: rnd(2) }; }, outs: ['a', 'x', 'y'] });
t({ name: 'joystick_direction', setup: keyboard, outs: ['a', 'x', 'y'] });
t({ name: 'fire_pressed', setup: keyboard, outs: ['a', 'z'] });
t({ name: 'copy_memory', setup: (M, c, rnd) => { M[0x80] = rnd(256); M[0x81] = 0x20 + rnd(0x60); M[0x82] = rnd(256); M[0x83] = 0x20 + rnd(0x60); M[0x84] = rnd(256); M[0x85] = rnd(3); }, outs: ['x', 'y'] });
t({ name: 'sound_play', port: 0x35, setup: (M, c, rnd) => ({ a: rnd(16) }), outs: [] });
t({ name: 'sound_step', port: 0x35, setup: (M, c, rnd) => { for (let x = 0; x < 3; x++) { M[0x28 + x] = rnd(3) ? rnd(40) : 0; M[0x2B + x] = [0, 1, 2, 0xFF][rnd(4)]; M[0x25 + x] = rnd(40); } M[0x1D] = rnd(2) ? 0xFF : 0; M[0x1E] = rnd(2) ? 0xFF : 0; M[0x0415] = rnd(256); }, outs: [] });
t({ name: 'sound_init', port: 0x35, outs: [] });
t({ name: 'frame_skip3', outs: ['a', 'c'] });
t({ name: 'to_decimal', setup: (M, c, rnd) => ({ a: rnd(100), c: 0 }), outs: ['a', 'x'] });
process.exitCode = f ? 1 : 0;
