'use strict';
// The text screens, the race's top level and the waits alone against the game's ($2FCE-$3FFA and
// the printing helpers), on moments of play with the league's state stirred.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 400, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 2, rnd(256), rnd(256)][rnd(10)];
const bcd = rnd => (rnd(10) << 4) | rnd(10);
// the league: players, division, Super League, the track and slot, the tables in a shuffled order
const league = (M, c, rnd) => {
  M[0x31A1] = rnd(3) ? 0 : rnd(8);
  M[0x31A0] = rnd(4) ? 0 : 0x80;
  M[0xC71A] = rnd(3) ? 0 : [1, 0x0B][rnd(2)];
  M[0xC718] = rnd(4); M[0xC360] = rnd(4);
  M[0xC77D] = rnd(8); M[0xC77F] = rnd(2);
  M[0x31A2] = rnd(8); M[0x31A3] = rnd(2) ? 6 : rnd(9);
  M[0x31A4] = 0x0B; M[0x31A6] = rnd(12);
  M[0x31A5] = byte(rnd); M[0xC39C] = byte(rnd); M[0xC74B] = rnd(10);
  M[0xC305] = [0, 1, 0xC0, 0xC1][rnd(4)]; M[0xC372] = rnd(2) ? 0x80 : 0;
  M[0xC356] = rnd(2) ? 0x80 : 0;
  const order = [...Array(12).keys()];
  for (let i = 11; i > 0; i--) { const j = rnd(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  for (let i = 0; i < 12; i++) { M[0xC70C + i] = order[i]; M[0xC758 + i] = rnd(3) ? order[(i + 1) % 12] : order[i]; }
  for (let i = 0; i < 12; i++) {
    M[0xC728 + i] = rnd(7); M[0xC734 + i] = rnd(7); M[0xC740 + i] = rnd(13); M[0xC74C + i] = rnd(30);
    M[0x8298 + i] = bcd(rnd); M[0x82B0 + i] = (rnd(6) << 4) | rnd(10); M[0x8398 + i] = rnd(10);
    M[0x8298 + 12 + i] = bcd(rnd); M[0x82B0 + 12 + i] = (rnd(6) << 4) | rnd(10); M[0x8398 + 12 + i] = rnd(10);
  }
  M[0xC76F] = rnd(12); M[0xC770] = rnd(12); M[0xC771] = rnd(12); M[0xC772] = rnd(12);
  M[0x19] = rnd(10); M[0x7A] = 9 + rnd(12); M[0x74] = 9 + rnd(12);
  M[0xC7] = rnd(12); M[0x50] = rnd(12); M[0x8A] = (M[0x50] + 1 + rnd(4)) & 255;
};
const L = { setup: (M, c, rnd) => { league(M, c, rnd); return { x: rnd(256), y: rnd(256) }; } };
T('PRINT_AT', { setup: (M, c, rnd) => ({ x: rnd(45), y: rnd(25) }), outs: ['a', 'x', 'y'] });
T('PRINT_DIGIT', { setup: (M, c, rnd) => ({ a: rnd(10) }), outs: ['a', 'x', 'y'] });
T('SPACES_3', { outs: ['a', 'x', 'y'] }); T('SPACES_2', { outs: ['a', 'x', 'y'] }); T('SPACE', { outs: ['a', 'x', 'y'] });
T('TO_BCD', { setup: (M, c, rnd) => ({ a: rnd(256) }), outs: ['a', 'x', 'y', 'c'] });
for (const n of ['PRINT_STRING_E000', 'PRINT_MENU_STRING', 'PRINT_STRING', 'PRINT_STRING_B'])
  T(n, { setup: (M, c, rnd) => { M[0x31A0] = rnd(2) ? 0x80 : 0; return { x: [0, 0x0D, 0x2C, 0x58, 0x86, 0x93, 0xA0, 0xBB, 0xD7, 0xF4][rnd(10)], y: rnd(25) }; }, outs: ['a', 'x', 'y'] });
for (const n of ['NUMBER_2SP', 'NUMBER', 'NUMBER_SP', 'PRINT_BCD']) T(n, { setup: (M, c, rnd) => ({ a: rnd(2) ? rnd(100) : rnd(256) }), outs: ['a', 'x', 'y'] });
T('ADD_TIME', { setup: (M, c, rnd) => { league(M, c, rnd); return { x: rnd(24), y: rnd(24) }; }, outs: ['a', 'x', 'y', 'c'] });
T('DRIVER_NAME', { setup: (M, c, rnd) => ({ x: rnd(2) ? rnd(16) : rnd(256) }), outs: ['a', 'x', 'y'] });
T('TRACK_NAME', { setup: (M, c, rnd) => ({ x: rnd(2) ? rnd(16) : rnd(256) }), outs: ['a', 'x', 'y'] });
T('TEXT_ON_ROWS', { outs: ['a', 'x', 'y'] }); T('TEXT_HALF_DOWN', { outs: ['a', 'x', 'y'] });
T('COLOUR_ROW', { setup: (M, c, rnd) => ({ x: rnd(40), y: rnd(2) ? rnd(25) : rnd(256) }), outs: ['a', 'x', 'y'] });
T('COLOUR_RUNS', { setup: (M, c, rnd) => { M[0x1E] = rnd(256); M[0x1F] = 0x7C + rnd(3); return { x: [0, 8, 0x0A, 0x0E, 0x10, 0x12, 0x14][rnd(7)], a: 1 + rnd(2), y: rnd(256) }; }, outs: ['a', 'x', 'y'] });
T('COLOUR_COPY', { setup: (M, c, rnd) => { M[0x1E] = rnd(256); M[0x1F] = 0x7C + rnd(3); return { x: [0, 5, 0x0E][rnd(3)], y: rnd(200) }; }, outs: ['a', 'x', 'y'] });
T('PANEL_FRAME', { outs: ['a', 'x', 'y'] });
T('PANEL_ROW', { setup: (M, c, rnd) => ({ y: 8 + rnd(17) }), outs: ['a', 'x', 'y'] });
T('BITMAP_BYTE', { setup: (M, c, rnd) => ({ x: rnd(256), y: rnd(256) }), outs: ['a', 'x', 'y'] });
T('HLINE_SCREEN', { setup: (M, c, rnd) => ({ x: rnd(256), y: 0x38 + rnd(0xC0), a: 1 + rnd(0x20) }), outs: ['a', 'x', 'y'] });
T('HLINE', { setup: (M, c, rnd) => ({ x: rnd(256), y: 0x38 + rnd(0xC0), a: 1 + rnd(0x20) }), outs: ['a', 'x', 'y'] });
T('HLINE_TOP', { setup: (M, c, rnd) => ({ y: 0x38 + rnd(0xC0) }), outs: ['a', 'x', 'y'] });
T('HLINE_UNDER', { setup: (M, c, rnd) => { M[0x74] = rnd(25); }, outs: ['a', 'x', 'y'] });
T('VLINE', { setup: (M, c, rnd) => { M[0x15] = rnd(256); return { x: rnd(256), y: 0x50 + rnd(0xB0), a: 1 + rnd(0x20) }; }, outs: ['a', 'x', 'y'] });
T('WOOD_GRAIN', { cases: 100, setup: (M, c, rnd) => { M[0x18] = byte(rnd); M[0x19] = byte(rnd); M[0x16] = rnd(256); return { x: [0x38, 0x3C, 0xB0, 0xC4, 0xCC, rnd(256)][rnd(6)] }; }, outs: ['x', 'y'] });
T('WOOD_POSTS', { cases: 30, outs: ['x', 'y'] });
T('TRACK_TITLE', { cases: 100, setup: L.setup, outs: ['a', 'x', 'y'] });
T('PICK_TRACK', { setup: (M, c, rnd) => { league(M, c, rnd); return { a: rnd(8) }; }, outs: ['a', 'x', 'y'] });
T('DASH_COLOURS', { outs: ['a', 'x'] });
T('MULTI_RESULTS', { cases: 200, setup: L.setup });
T('TRACK_HEADER', { setup: (M, c, rnd) => { league(M, c, rnd); return { y: rnd(25) }; }, outs: ['a', 'x', 'y'] });
T('NEW_DRIVERS', { setup: L.setup, outs: ['a', 'x', 'y'] });
T('ALL_RAM', { outs: ['a', 'x', 'y'] }); T('IO_BACK', { port: 0x34, outs: ['a', 'x', 'y'] });
T('DIVISION_PANEL', { cases: 200, setup: L.setup, outs: ['a', 'x', 'y'] });
T('DIVISION_AT', { setup: (M, c, rnd) => { league(M, c, rnd); return { y: rnd(25) }; }, outs: ['a', 'x', 'y'] });
T('TABLE_ROW', { setup: L.setup, outs: ['a', 'x', 'y'] });
T('PAIRING', { setup: (M, c, rnd) => { league(M, c, rnd); return { a: rnd(12) }; }, outs: ['a', 'x', 'y'] });
T('CHANGES', { setup: L.setup, outs: ['a', 'x', 'y'] });
T('FIND_DRIVER', { setup: (M, c, rnd) => { league(M, c, rnd); return { a: rnd(14) }; }, outs: ['a', 'x'] });
T('LINES', { setup: (M, c, rnd) => { league(M, c, rnd); return { a: 1 + rnd(3) }; }, outs: ['a', 'x', 'y'] });
T('LINES_3', L); T('LINE_START', L); T('NEXT_LINE', { setup: L.setup, outs: ['a', 'x', 'y'] });
T('RACE_SCREEN_COLOURS', { cases: 50, setup: L.setup, outs: ['a', 'x', 'y'] });
// the race's top level and the waits
T('CLEAR_RACE', { cases: 100, setup: L.setup });
T('CLEAR_BARS', { outs: ['a', 'x'] });
T('START_ORDER', { setup: L.setup });
T('START_SOUNDS', { outs: ['a'] });
T('REQUEST_FLIP', { setup: (M, c, rnd) => { M[0xC306] = byte(rnd); M[0xA1F2] = [0xE8, rnd(256)][rnd(2)]; }, outs: ['a'] });
T('FLIP_IF_READY', { setup: (M, c, rnd) => { M[0xC37B] = rnd(2) ? 0 : byte(rnd); M[0xC37A] = byte(rnd); } });
T('FLIP_DONE', { setup: (M, c, rnd) => { M[0xC37A] = byte(rnd); } });
T('MENU_BITMAP', { outs: ['a', 'x', 'y'] });
T('SCREEN_ON', { setup: (M, c, rnd) => { c.vic[0x11] = rnd(256); }, outs: ['a', 'x', 'y'] });
T('SCREEN_ON_NOW', { setup: (M, c, rnd) => { c.vic[0x11] = rnd(256); }, outs: ['a', 'x', 'y'] });
T('DELAY', { cases: 30, setup: (M, c, rnd) => { M[0x14] = rnd(256); return { y: 1 + rnd(3) }; }, outs: ['a', 'x', 'y'] });
T('BLANK_SCREEN', { cases: 30, setup: (M, c, rnd) => { M[0x3FBA] = rnd(16); }, outs: ['a', 'x', 'y'] });
T('BORDER_BLANK', { cases: 30, setup: (M, c, rnd) => ({ a: rnd(16) }), outs: ['a', 'x', 'y'] });
T('MENU_BACKDROP', { cases: 30, setup: L.setup });
process.exitCode = f ? 1 : 0;
