'use strict';
// The title screen's routines, against the game's (lib.js).
const { check } = require('./lib.js');
const screen = rnd => 0x0C00 + rnd(0x3C0);
const bcd = rnd => rnd(10) << 4 | rnd(10);

// The controls a frame at a time, from the frame count and the case's seed, the same on both sides.
let seed = 0;
function hash(a, b) {
  let h = (a ^ Math.imul(b + 1, 0x9E3779B1)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x85EBCA6B) >>> 0; h ^= h >>> 13;
  return h;
}
const frame = { pcs: [0x3060, 0x3543], fn: M => {
  M[0x64] = (M[0x64] + 1) & 0xFF;
  const h = hash(seed, M[0x64]);
  M[0xA6] = M[0x09]; M[0x09] = [0x00, 0x00, 0x01, 0xFF][h & 3];
  M[0x0C] = M[0x0B]; M[0x0B] = (h >>> 2) % 7 === 0 ? 0x08 : 0x00;
  M[0xA4] = M[0xA5]; M[0xA5] = (h >>> 6) & 0x02 ? 0xFF : 0xFD;
} };
function score(M, rnd) {
  M[0xAC] = [0x00, 0x00, 0x00, 0x01, bcd(rnd)][rnd(5)]; M[0xAB] = bcd(rnd); M[0xAA] = bcd(rnd);
  if (rnd(6) === 0) M[0xAA] = M[0xAB] = M[0xAC] = 0;
  if (rnd(6) === 0) { const e = 0x3493 + 9 * rnd(5); M[0xAC] = M[e + 6]; M[0xAB] = M[e + 7]; M[0xAA] = M[e + 8]; }
}

check({ name: 'next_direction', cases: 2000, setup: (M, rnd) => {
  M[0x09] = [0x00, 0x01, 0xFF][rnd(3)]; M[0xA6] = rnd(2) ? M[0x09] : [0x00, 0x01, 0xFF][rnd(3)]; M[0x17] = rnd(10);
}, outs: ['a'] });
check({ name: 'change_level', cases: 2000, setup: (M, rnd) => {
  M[0x09] = [0x00, 0x01, 0xFF][rnd(3)]; M[0xA6] = rnd(2) ? M[0x09] : 0; M[0x17] = rnd(4); M[0xA7] = rnd(8) ? rnd(16) : rnd(256);
}, outs: ['a', 'c'] });
check({ name: 'show_controls', setup: (M, rnd) => { M[0xA3] = rnd(256); }, outs: ['a', 'x', 'y'] });
check({ name: 'toggle_controls', cases: 2000, setup: (M, rnd) => { M[0xA3] = rnd(256); M[0xA4] = rnd(256); M[0xA5] = rnd(256); },
  outs: ['a'] });
check({ name: 'print_hiscore', setup: (M, rnd) => {
  const s = screen(rnd), t = 0x3493 + rnd(0x30); M[0x0D] = s & 0xFF; M[0x0E] = s >> 8; M[0x0F] = t & 0xFF; M[0x10] = t >> 8;
  if (rnd(2)) for (let i = 0; i < 3; i++) M[t + i] = rnd(256);
}, outs: ['a', 'y', 'c'] });
check({ name: 'draw_hiscores', setup: (M, rnd) => { for (let a = 0x3493; a < 0x34C9; a++) if (rnd(3) === 0) M[a] = rnd(256); },
  outs: ['a', 'x', 'y', 'c'] });
check({ name: 'draw_box', cases: 2000, setup: (M, rnd) => {
  const s = screen(rnd); M[0x0D] = s & 0xFF; M[0x0E] = s >> 8;
  M[0x0F] = rnd(10) ? 1 + rnd(0x26) : rnd(256); M[0x10] = rnd(10) ? rnd(12) : rnd(256);
}, outs: ['a', 'x', 'y', 'c'] });
check({ name: 'print_script', cases: 2000, setup: (M, rnd) => {
  if (rnd(4) === 0) return { a: 0x02, x: 0x32 };           // the title's own
  let p = 0x0400;
  for (let n = rnd(40); n > 0; n--) {                      // one made up, in page $04
    const k = rnd(6);
    if (k === 0) { const s = screen(rnd); M[p++] = 0x01; M[p++] = s & 0xFF; M[p++] = s >> 8; }
    else if (k === 1) { M[p++] = 0x02 + rnd(0x7E); M[p++] = rnd(256); }
    else M[p++] = rnd(4) ? 0x81 + rnd(0x7F) : 0x00;
  }
  M[p] = 0x80;
  const s = screen(rnd);
  M[0x0F] = M[0x11] = s & 0xFF; M[0x10] = s >> 8; M[0x12] = (s >> 8) - 4; M[0x13] = rnd(256);
  return { a: 0x00, x: 0x04 };
}, outs: ['a', 'x', 'y', 'c'] });
check({ name: 'irq_title', cases: 3000, stopAt: 0x312F, setup: (M, rnd) => {
  M[0x64] = rnd(256); M[0x1F] = 1 + rnd(8); M[0xA3] = rnd(2) ? 0x80 : 0x00; M[0xA5] = rnd(256);
  const t = rnd(4) ? 0x3276 + rnd(0x221) : [0x33F7, 0x340F, 0x343B, 0x345B, 0x3472, 0x3496][rnd(6)];
  M[0x1B] = t & 0xFF; M[0x1C] = t >> 8;
} });
check({ name: 'high_scores', cases: 1500, poll: frame, setup: (M, rnd) => {
  seed = rnd(1 << 30); score(M, rnd); M[0x09] = 0; M[0x0B] = 0x08;
} });
check({ name: 'title', cases: 600, poll: frame, setup: (M, rnd) => {
  seed = rnd(1 << 30); score(M, rnd); M[0xA3] = rnd(2) ? 0x80 : 0x00; M[0xA7] = rnd(16);
} });
