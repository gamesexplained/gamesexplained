'use strict';
// The clocks, laps and dashboard alone against the game's ($0F2A-$164C), on random moments of play
// with the clocks, laps and counts stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1000, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 2, rnd(256), rnd(256)][rnd(10)];
const bcd = rnd => (rnd(10) << 4) | rnd(10);
const clocks = (M, rnd) => {
  for (let x = 0; x < 3; x++) {
    M[0x8298 + x] = rnd(4) ? bcd(rnd) : [0x99, 0x86, 0x87][rnd(3)];
    M[0x82B0 + x] = rnd(4) ? (rnd(6) << 4 | rnd(10)) : 0x59;
    M[0x8398 + x] = rnd(10);
  }
};
const race = (M, c, rnd) => {
  clocks(M, rnd);
  for (const a of [0x82, 0x6C, 0x6B, 0x2F, 0x6A, 0xC373, 0xC364, 0xC395, 0xC362, 0xC76C, 0xC352, 0xC302, 0xC35C, 0xC719, 0xC36A]) if (!rnd(3)) M[a] = byte(rnd);
  if (!rnd(3)) M[0x82] = rnd(3);
  if (!rnd(3)) M[0x6C] = rnd(8);
  if (!rnd(2)) M[0xC302] = [0, 1, 0x40, 0x41][rnd(4)];
  for (let x = 0; x < 2; x++) {
    if (!rnd(2)) M[0xC374 + x] = [M[0xC77C], M[0xC767], rnd(256)][rnd(3)];
    if (!rnd(2)) M[0xC376 + x] = rnd(2) ? 0x80 : 0;
    if (!rnd(2)) M[0xC378 + x] = [0, 1, 2, M[0xC354], (M[0xC354] - 1) & 255][rnd(5)];
  }
};
T('RACE_CLOCKS', { setup: race }); T('COUNTDOWN', { setup: race });
T('LAP_CHECK', { setup: (M, c, rnd) => { race(M, c, rnd); return { x: rnd(2) }; } });
T('LAPS_DONE', { setup: race });
T('FASTER', { setup: (M, c, rnd) => { clocks(M, rnd); return { x: rnd(2), y: 2 }; }, outs: ['c'] });
T('SHOW_BEST_LAP', { setup: race, outs: ['x'] });
T('CLEAR_CLOCK', { setup: (M, c, rnd) => ({ x: rnd(3) }) });
T('TICK_CLOCK', { setup: (M, c, rnd) => { race(M, c, rnd); return { x: rnd(2) }; } });
T('ADD_TO_CLOCK', { setup: (M, c, rnd) => { race(M, c, rnd); return { x: rnd(2), a: bcd(rnd) }; } });
T('SHOW_LAP_TIME', { setup: race, outs: ['x'] });
T('DAMAGE', { setup: (M, c, rnd) => { race(M, c, rnd); for (let x = 0; x < 3; x++) M[0xC3C3 + x] = byte(rnd); } });
T('BEST_LAMP', { setup: race }); T('WIN_LAMP', { setup: race, outs: ['y'] });
T('SHOW_DISTANCE', { setup: (M, c, rnd) => { race(M, c, rnd); M[0x39] = byte(rnd); M[0x3A] = byte(rnd); M[0xC30C] = rnd(2) ? 0 : rnd(256); } });
T('SPEED_TO_BAR', { setup: (M, c, rnd) => { M[0x0159] = byte(rnd); M[0xC34F] = rnd(0x40); } });
T('DRAW_TIME', { setup: (M, c, rnd) => { clocks(M, rnd); return { x: rnd(4), y: rnd(3), a: rnd(2) ? 0x80 : 0 }; } });
T('DASH_LABELS');
T('SHOW_MESSAGE', { setup: (M, c, rnd) => ({ y: [0, 8, 0x1C, 0x54, 0x2C, 0x3C, 0x4C][rnd(7)], a: [2, 4][rnd(2)], x: rnd(256) }), outs: ['x'] });
T('COLON', { setup: (M, c, rnd) => ({ x: rnd(256) }) });
for (const n of ['DIGIT_SHIFT_LEFT', 'DIGIT_SPLIT', 'DIGIT_SHIFT_RIGHT', 'DIGIT']) T(n, { setup: (M, c, rnd) => ({ x: rnd(0xC0), a: [rnd(10), 0xF0, 0xFD, 0x1C, 0x12][rnd(5)] }), outs: ['x', 'y'] });
T('GLYPH_ADDRESS', { setup: (M, c, rnd) => ({ a: rnd(256) }), outs: ['y'] });
T('DASH_SPRITES'); T('WHEEL_SPRITES', { setup: (M, c, rnd) => {
  for (let x = 0; x < 2; x++) { M[0x83 + x] = byte(rnd); M[0x86 + x] = [0, 1, 2, 7, 8, 0xFD, 0xFF, byte(rnd)][rnd(8)]; }
  M[0x1C] = [0xBA, 0x92, byte(rnd)][rnd(3)]; M[0xC30A] = byte(rnd); M[0x6E] = byte(rnd);
} });
T('WRECK', { setup: (M, c, rnd) => { M[0x6C] = rnd(2) ? 0 : byte(rnd); return { x: rnd(256) }; } });
T('SWERVE', { setup: (M, c, rnd) => {
  M[0xC9] = rnd(4) ? 1 : 0; M[0xC30F] = rnd(2) ? rnd(17) : 0; M[0xC358] = rnd(2) ? 8 : 0x10;
  M[0xC353] = byte(rnd); M[0xC773] = rnd(32); M[0xC36A] = rnd(2) ? 0 : 0x80; M[0xB2] = rnd(2) ? 0 : byte(rnd); M[0xA4] = byte(rnd);
} });
T('RESET_SEASON'); T('SAVE_ZP_02');
T('LOAD_ZP_02', { setup: (M, c, rnd) => ({ y: rnd(2) ? 4 : 9 }) });
process.exitCode = f ? 1 : 0;
