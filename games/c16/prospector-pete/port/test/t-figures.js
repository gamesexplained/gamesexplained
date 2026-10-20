'use strict';
// The figures' frames and drawing, and the creatures, against the game's (lib.js).
const { check } = require('./lib.js');
const cellAt = (col, row) => 0x37EA + row * 0x5A + col;
// Creatures out near Pete, on cells of the map, some mid-step.
function creatures(M, rnd) {
  for (let n = 0; n < 4; n++) {
    if (rnd(3) === 0) continue;
    const col = Math.max(1, Math.min(88, M[0x06] + rnd(9) - 4)), row = Math.max(4, Math.min(21, M[0x07] + rnd(7) - 3));
    const d = 1 + rnd(4), p = cellAt(col, row), q = p - [0, -0x5A, 0x5A, -1, 1][d] * (rnd(4) ? 1 : 0);
    M[0x23 + n] = 1; M[0x28 + n] = rnd(4); M[0x4B + n] = d; M[0x8A + n] = col; M[0x8E + n] = row;
    M[0x30 + 4 * n] = p & 0xFF; M[0x31 + 4 * n] = p >> 8; M[0x32 + 4 * n] = q & 0xFF; M[0x33 + 4 * n] = q >> 8;
    for (const o of [-0x5A, 0x5A, -1, 1]) if (rnd(3) === 0) M[p + o] = [0x00, 0x01, 0x5C, 0x6C, 0x6F, 0xA2, 0x35][rnd(7)];
    if (rnd(8) === 0) M[p] = 0xA2;
  }
  M[0x9D] = 3;
}
check({ name: 'build_figures', cases: 50, outs: ['a', 'x', 'y', 'c'] });
check({ name: 'shift_frames', setup: (M, rnd) => {
  const page = 5 + rnd(2);
  for (let x = 0x0F; x >= 0; x -= 2) M[0x0D + x] = page;
  return { a: [0x00, 0x20, 0x40, 0x60][rnd(4)], x: 1 + rnd(8) };
}, outs: ['a', 'x', 'y', 'c'] });
const figures = (M, rnd) => {
  creatures(M, rnd);
  M[0x4A] = rnd(5); M[0x27] = rnd(4);
  for (let i = 0; i < 10; i++) M[0x40 + i] = rnd(256);
};
check({ name: 'draw_figures', cases: 3000, setup: figures });
check({ name: 'draw_standing', setup: (M, rnd) => { M[0x26D4] = rnd(256); M[0x26D5] = 0x10 + rnd(8); return { y: 7 }; } });
check({ name: 'stamp_figures', cases: 3000, setup: figures });
check({ name: 'unstamp_figures', cases: 3000, setup: figures });
check({ name: 'creature_blast', cases: 3000, setup: (M, rnd) => { creatures(M, rnd); const n = rnd(4); M[0x96] = n; return { x: n }; } });
check({ name: 'move_creatures', cases: 4000, maxSteps: 2e5, setup: (M, rnd) => { creatures(M, rnd); } });
check({ name: 'move_creature', cases: 2000, setup: (M, rnd) => {
  creatures(M, rnd); const n = rnd(4); M[0x96] = n; M[0x9C] = 4 * n;
  const p = M[0x30 + 4 * n] | M[0x31 + 4 * n] << 8, a = p - 0x5A; M[0x84] = a & 0xFF; M[0x85] = a >> 8;
  return { x: rnd(4) };
}, outs: ['a', 'x', 'c'] });
for (const name of ['chase_across', 'chase_updown']) check({ name, cases: 2000, setup: (M, rnd) => {
  creatures(M, rnd); const n = rnd(4); M[0x96] = n; M[0x9C] = 4 * n;
  const p = M[0x30 + 4 * n] | M[0x31 + 4 * n] << 8, a = p - 0x5A; M[0x84] = a & 0xFF; M[0x85] = a >> 8;
  M[0x97] = rnd(256); M[0x98] = rnd(256); M[0x99] = rnd(4); for (let i = 0; i < 4; i++) M[0x92 + i] = rnd(2) ? 0 : 1;
}, outs: ['c'] });
