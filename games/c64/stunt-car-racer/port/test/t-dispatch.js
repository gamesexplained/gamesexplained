'use strict';
// The command dispatcher's routines alone against the game's ($83C0-$9122), on random moments of
// play with their inputs stirred: the video modes, the fills and copies, the printer, the keyboard,
// the sound effects, and the race's jobs ($3C-$47) but the disk's command, which needs the KERNAL
// (t-disk.js).
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 600, outs: [] }, o)).fails ? 1 : 0; };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, rnd(256), rnd(256), rnd(256)][rnd(10)];
const range = (rnd, lo, hi) => lo + rnd(hi - lo + 1);
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };

T('VIDEO_MULTICOLOUR'); T('VIDEO_HIRES');
T('SET_VIDEO', { setup: (M, c, rnd) => ({ a: byte(rnd) }) });
T('MENU_SCREEN', { setup: (M, c, rnd) => ({ x: byte(rnd) }), cases: 100 });
T('FILL_SCREEN', { setup: (M, c, rnd) => ({ a: byte(rnd) }), cases: 100 });
T('COPY_VIEW_OR_CLEAR', { setup: (M, c, rnd) => ({ a: rnd(4) }), cases: 100 });
T('FILL_ROWS', { setup: (M, c, rnd) => { M[0x52] = range(rnd, 1, 20); return { x: rnd(256), y: range(rnd, 0x40, 0x60), a: byte(rnd) }; }, cases: 200 });
T('PRINT_CHAR', { setup: (M, c, rnd) => {
  M[0x846D] = rnd(4) ? 0 : 0x1F; M[0x846E] = rnd(3); M[0x85C5] = rnd(45); M[0x85C6] = rnd(25);
  M[0x85D0] = rnd(2) ? 0x80 : 0; M[0x85D1] = rnd(2) ? 0x80 : 0; M[0xFB] = rnd(256); M[0xC3D9] = rnd(2) ? 0 : rnd(8);
  return { a: [0x1F, 0x09, 0x7F, 0x80, 0xC1, range(rnd, 0x20, 0x5F), range(rnd, 0x20, 0x5F), range(rnd, 0x20, 0x5F)][rnd(8)] };
}, outs: ['a', 'x', 'y'], cases: 3000 });
T('KEY_SCAN', { setup: (M, c, rnd) => { c.game.keys = new Set([rnd(64), rnd(64)].filter(() => rnd(2))); return { x: rnd(64) }; }, outs: ['x', 'n', 'z'], cases: 2000 });
T('START_EFFECT', { setup: (M, c, rnd) => {
  const b = 0x0300 + rnd(0x100);
  M[b] = rnd(3); for (let i = 1; i < 7; i++) M[b + i] = rnd(256);
  return { x: b & 255, y: b >> 8 };
}, outs: ['x'] });
T('EFFECT_TICK', { setup: (M, c, rnd) => { M[0x86C9] = [0, 0x80, 1, 2, rnd(256)][rnd(5)]; M[0x86D5] = [0, 1, 2, rnd(256)][rnd(4)]; M[0x86D1] = rnd(256); M[0x86D9] = rnd(256); } });
T('CUT_EFFECT', { setup: (M, c, rnd) => ({ x: rnd(3) }) });
T('UNPACK_DASHBOARD', { cases: 30 });
T('SAVE_RESTORE_SCREEN', { setup: (M, c, rnd) => ({ x: rnd(2) ? 0x80 : 0 }), cases: 60 });

// the race's jobs
T('DRAWBRIDGE', { setup: (M, c, rnd) => {
  const seg = () => [range(rnd, 0x2E, 0x39), rnd(256)][rnd(2)];
  M[0xC374] = seg(); M[0xC375] = rnd(4) ? seg() : 0x2F; M[0xE7] = rnd(2) ? 0 : 0x0C; M[0xC300] = rnd(256);
} });
T('COLUMN_LIMITS', { setup: (M, c, rnd) => {
  M[0x33] = byte(rnd); M[0x69] = [0, 0xFF, 1, 0xFE, rnd(256)][rnd(5)]; M[0x0126] = byte(rnd);
  for (let y = 0; y < 0x40; y++) { M[0xC640 + y] = rnd(256); M[0xC680 + y] = rnd(256); }
  for (let y = 0; y < 0x41; y++) if (rnd(2)) M[0x0380 + y] = rnd(256);
}, cases: 1000 });
const edges = (M, rnd, base) => {
  const k = rnd(3);
  for (let x = 0x40; x < 0xC0; x++) M[base + x] = k === 0 ? rnd(256) : k === 1 ? range(rnd, 0x38, 0xC8) : (0xA0 - (x >> 1) + rnd(4)) & 255;
};
T('FILL_ABOVE_EDGES', { setup: (M, c, rnd) => { edges(M, rnd, 0xC600); M[0x12] = rnd(2) ? 0x20 : 0; }, cases: 400 });
T('CRANE_CHAINS', { setup: (M, c, rnd) => { M[0x2F] = rnd(2); M[0xC36B] = rnd(3) ? range(rnd, 0x5F, 0xC0) : 0x5F; M[0xC36C] = rnd(0x40); M[0x12] = rnd(2) ? 0x20 : 0; }, cases: 400 });
T('CHAIN', { setup: (M, c, rnd) => { M[0xC36B] = range(rnd, 0x48, 0xC0); M[0x12] = rnd(2) ? 0x20 : 0; return { x: range(rnd, 0x40, 0xB8) }; }, cases: 400 });
T('FRONT_WHEEL', { setup: (M, c, rnd) => { M[0x14] = range(rnd, 0xC0, 0xDF); return { x: rnd(2) }; }, outs: ['x'], cases: 400 });
T('MARK_COLUMNS', { setup: (M, c, rnd) => { M[0x60] = rnd(256); M[0x61] = rnd(256); for (let x = 0x40; x < 0xC0; x++) M[0x0240 + x] = [0, 0, rnd(256)][rnd(3)]; }, cases: 1000 });
T('FILL_SPANS', { setup: (M, c, rnd) => {
  edges(M, rnd, 0xC600); edges(M, rnd, 0x0240);
  const a = range(rnd, 0x40, 0xBF), b = range(rnd, a, 0xBF);
  M[0x41] = a & 0xFC; M[0x55] = (b + 4) & 0xFC; M[0x6D] = rnd(256); M[0x12] = rnd(2) ? 0x20 : 0;
}, cases: 1000 });
T('TOGGLE_EDGES', { setup: (M, c, rnd) => { edges(M, rnd, 0xC600); edges(M, rnd, 0x0240); return { x: range(rnd, 0x10, 0x3F) * 4 }; }, cases: 1000 });
T('SPEED_BAR', { setup: (M, c, rnd) => { M[0xC34F] = rnd(0x40); return { x: rnd(256) }; }, cases: 2000 });
T('PIECE_TABLE', { setup: (M, c, rnd) => {
  if (rnd(2)) { M[0xC778] = rnd(5); for (let i = 0; i < 6; i++) { M[0x075E + i] = rnd(M[0xC764] + 1); M[0x0769 + i] = rnd(256); } }
  return { x: rnd(0x80) };
}, cases: 1000 });
T('CLEAR_VIEW', { setup: (M, c, rnd) => { M[0x12] = rnd(2) ? 0x20 : 0; return { x: rnd(2) ? 0x80 : 0 }; }, cases: 100 });
T('SET_ROW_COLOURS', { setup: (M, c, rnd) => {
  for (let x = 0; x < 0x80; x += 4) { M[0x0200 + x] = range(rnd, 6, 0x17); M[0x0201 + x] = rnd(2) ? M[0x0200 + x] : range(rnd, 6, 0x17); }
  M[0xC76B] = rnd(256);
}, cases: 1000 });
T('DISPATCH', { setup: (M, c, rnd) => {
  M[0x52] = range(rnd, 1, 4);
  return { a: [0x01, 0x02, 0x20, 0x81, 0x15, 0x55, 0x33, 0x00, 0xFF][rnd(9)], x: rnd(3), y: range(rnd, 0x40, 0x60) };
}, outs: [], cases: 500 });
process.exitCode = f ? 1 : 0;
