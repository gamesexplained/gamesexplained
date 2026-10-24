'use strict';
// The drawing's routines (src/g-draw.js), each checked alone against the game's (check.js), on
// the moments of play with the pictures, texts and boxes of the game's own screens.
//   node t-draw.js [cases] [routine]
const { check } = require('./check.js');

const w = (M, a) => M[a] | M[a + 1] << 8;
// an icon of a screen, at random: its record's address
function icon(M, rnd) {
  const s = rnd(9);
  let p = w(M, 0x789C + 2 * s);
  const all = [];
  for (; w(M, p) !== 0xFFFF; p += 11) all.push(p);
  return { s, p: all[rnd(all.length)] };
}
// a box of a screen, at random
function box(M, rnd) {
  for (;;) {
    let p = w(M, 0x789C + 2 * rnd(9));
    for (; w(M, p) !== 0xFFFF; p += 11);
    const all = [];
    for (p += 2; w(M, p) !== 0xFFFF; p += 4) all.push(p);
    if (all.length) return all[rnd(all.length)];
  }
}
const setw = (M, a, v) => { M[a] = v & 255; M[a + 1] = v >> 8; };
const STACK = [[0x100, 0x1FF]];

const CHECKS = [
  { name: 'multiply', outs: ['a', 'y', 'c'], setup: (M, c, rnd) => ({ a: rnd(256), y: rnd(256) }) },
  { name: 'cell_address', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => ({ x: rnd(40), y: rnd(25) }) },
  { name: 'glyph_address', outs: ['a', 'x'], setup: (M, c, rnd) => { M[0x4A0F] = rnd(256); } },
  { name: 'swap_y', outs: ['a', 'y'] },
  { name: 'draw_picture', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
    const { p } = icon(M, rnd);
    M[0x31] = M[p]; M[0x32] = M[p + 1]; M[0x4A1E] = 0;
    return { x: M[p + 2], y: M[p + 3] };
  } },
  { name: 'print_text', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
    const { p } = icon(M, rnd);
    M[0x3D] = M[p + 5]; M[0x3E] = M[p + 6]; M[0x7D] = M[p + 8];
    return { x: M[p + 7] };
  } },
  // the icons the cursor can choose (their flags' bit 0), whose frames stay on the bitmap
  { name: 'frame_icon', outs: ['a', 'x', 'c'], setup: (M, c, rnd) => {
    let p, pic;
    do { p = icon(M, rnd).p; pic = w(M, p); } while (!(M[p + 4] & 1));
    M[0x49F1] = M[pic]; M[0x49F2] = M[pic + 1]; M[0x543F] = [0, 2, 3][rnd(3)];
    return { x: M[p + 2], y: M[p + 3] };
  } },
  { name: 'draw_box', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
    const b = box(M, rnd);
    M[0x49F1] = M[b]; M[0x49F2] = M[b + 1];
    return { x: M[b + 2], y: M[b + 3] };
  } },
  { name: 'plot_canvas', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => ({ x: rnd(48), y: rnd(42) }) },
  { name: 'plot_pixel', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => { M[0x45D4] = rnd(4); return { x: rnd(160), y: rnd(200) }; } },
  { name: 'iris_circle', outs: [], setup: (M, c, rnd) => {
    const k = rnd(3);
    M[0x4728] = [0x33, 0x66, 0xCC][k]; M[0x4729] = 3 + k; M[0x4A0E] = rnd(2);
    return { x: rnd(0x14), y: rnd(2) << 7 };
  } },
  { name: 'iris_open', outs: ['a'] },
  { name: 'iris_close', outs: ['a'] },
  { name: 'iris_finer', outs: [] },
  { name: 'iris_coarser', outs: [] },
  { name: 'clear_panels', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x4A62] = rnd(256); } },
  { name: 'colour_status_icon', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => ({ a: rnd(6), y: rnd(16) }) },
  { name: 'print_clock', outs: ['a', 'x', 'y'] },
  { name: 'draw_screen', outs: ['a', 'y'], cases: 200, setup: (M, c, rnd) => ({ a: rnd(9) }) },
  { name: 'b_4324', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
    // as show_portrait calls it: the colours of a portrait at the monitor
    const ch = rnd(6);
    setw(M, 0x31, w(M, 0x4A23 + 4 * ch));
    M[0x7D] = 0; M[0x4A1E] = 1; M[0x49F1] = 0x50; M[0x49F2] = 8;
    setw(M, 0x2B, 0x2360); setw(M, 0x2D, 0x0C5C); setw(M, 0x2F, 0xD85C);
  } },
  // the roll's raster waits passed over on the game's side; the port's waits are taken as they come
  { name: 'show_portrait', outs: [], cases: 60, hooks: { 0x49A9: c => { c.pc = 0x49AE; return false; } },
    setup: (M, c, rnd) => { M[0x5436] = rnd(7); } },
];

if (require.main === module) {
  const cases = +(process.argv[2] || 2000), only = process.argv[3];
  let fails = 0;
  for (const o of CHECKS) {
    if (only && o.name !== only) continue;
    const r = check(Object.assign({ cases: Math.min(cases, o.cases || cases), ignore: STACK }, o));
    fails += r.fails;
  }
  process.exitCode = fails ? 1 : 0;
}
module.exports = { CHECKS };
