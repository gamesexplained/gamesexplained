'use strict';
// The flood's routines, against the game's (lib.js), on states with water and on states given some.
const { check } = require('./lib.js');
// A few cells of water at random stages near the bottom of the shaft, on the list in order of row.
function flood(M, rnd) {
  if (M[0x0202] && rnd(2)) return;
  const cells = [];
  for (let n = 1 + rnd(6); n > 0; n--) {
    const row = 14 + rnd(8), col = 30 + rnd(30);
    cells.push([0x37EA + row * 0x5A + col, row]);
  }
  cells.sort((a, b) => b[1] - a[1]);
  const CH = [0x5C, 0x5E, 0x5F, 0x60, 0x63, 0x64, 0x67, 0x68, 0x6B, 0x6C];
  cells.forEach(([p, row], i) => {
    M[0x0200 + 3 * i] = p & 0xFF; M[0x0201 + 3 * i] = p >> 8; M[0x0202 + 3 * i] = row;
    M[p] = CH[rnd(CH.length)];
    for (const d of [-0x5A, -1, 1, 0x5A]) if (rnd(2)) M[p + d] = [0x00, 0x01, 0x6F, 0xA2, 0xA3, 0x6C, 0x35][rnd(7)];
  });
  M[0x0202 + 3 * cells.length] = 0;
  M[0x5B] = 3 * (cells.length - 1);
  M[0x57] = cells[cells.length - 1][1] - rnd(3);
  M[0x58] = rnd(2) ? 0 : 20;
}
check({ name: 'water_fill', cases: 3000, setup: flood });
check({ name: 'water_flow', cases: 3000, setup: flood });
check({ name: 'water_step', cases: 3000, setup: (M, rnd) => { flood(M, rnd); M[0x59] = rnd(4); } });
check({ name: 'drop_water', cases: 2000, setup: (M, rnd) => { flood(M, rnd); M[0x5D] = 3 * rnd(1 + M[0x5B] / 3); } });
const addAt = (M, rnd) => {
  flood(M, rnd);
  M[0x5D] = 3 * rnd(1 + M[0x5B] / 3); M[0x5A] = 12 + rnd(12);
  for (let i = 0; i < 10; i++) M[0x70 + i] = rnd(256);
  return { x: 2 * rnd(5) };
};
check({ name: 'add_water', cases: 3000, setup: addAt, outs: ['a', 'x', 'y', 'c'] });
for (const name of ['flow_left', 'flow_right', 'flow_down', 'flow_up']) {
  check({ name, cases: 2000, setup: (M, rnd) => {
    flood(M, rnd);
    M[0x5D] = 3 * rnd(1 + M[0x5B] / 3); M[0x5A] = 12 + rnd(12); M[0x5C] = 0;
    const p = 0x3952 + rnd(0x3E00 - 0x3952);
    M[0x70] = p & 0xFF; M[0x71] = p >> 8;
    [[0x72, -0x5A], [0x74, 0x5A], [0x76, -1], [0x78, 1]].forEach(([z, d]) => { M[z] = (p + d) & 0xFF; M[z + 1] = (p + d) >> 8; M[p + d] = [0x00, 0x01, 0x6F, 0xA2, 0xA3, 0x6C][rnd(6)]; });
    // now and then a list as long as the index flow_down is sent round by
    if (rnd(8) === 0) { M[0x5B] = [0x6C, 0x9F][rnd(2)]; M[0x5D] = M[0x5B]; for (let i = 0; i <= M[0x5B] + 2; i += 3) M[0x0202 + i] = 30; M[0x0202 + M[0x5B] + 3] = 0; }
  } });
}
