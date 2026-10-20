'use strict';
// Pete's routines, against the game's (lib.js).
const { check } = require('./lib.js');
const DIRS = [0x00, 0x01, 0xFF];
const frame = { pcs: [0x2A48, 0x2A75], fn: M => { M[0x64] = (M[0x64] + 1) & 0xFF; } };
const nearPete = (M, rnd, v) => {
  const p = (M[0x2C] | M[0x2D] << 8) & 0x3FFF;
  for (const d of [-0xB5, -0xB4, -0xB3, -0x5B, -0x5A, -0x59, -1, 1, 0x59, 0x5A, 0x5B, 0xB3, 0xB4, 0xB5]) {
    if (rnd(4) === 0 && p + d >= 0x37EA && p + d < 0x4000) M[p + d] = v(rnd);     // in the map only
  }
};
const cell = rnd => [0x00, 0x01, 0x03, 0x07, 0x12, 0x35, 0x5C, 0x63, 0x6C, 0x6F, 0x70, 0x75, 0x84, 0x94, 0xA2, 0xA3][rnd(16)];
check({ name: 'move_pete', cases: 4000, setup: (M, rnd) => {
  M[0x09] = DIRS[rnd(3)]; M[0x0A] = DIRS[rnd(3)];
  if (rnd(2)) { M[0x4A] = 1 + rnd(4); M[0x27] = rnd(4); }
  M[0x6B] = rnd(2);
  nearPete(M, rnd, cell);
} });
check({ name: 'read_controls', setup: (M, rnd) => { M[0xA3] = rnd(2) ? 0x80 : 0; M[0x0B] = rnd(2) ? 8 : 0; }, outs: ['a', 'x'] });
check({ name: 'read_key_row', setup: (M, rnd) => ({ a: rnd(256) }), outs: ['a'] });
check({ name: 'check_ring', setup: (M, rnd) => { nearPete(M, rnd, cell); return { a: [0x5C, 0x5A, 0xB5, 0x01][rnd(4)] }; }, outs: ['a', 'x', 'y', 'c'] });
check({ name: 'can_enter', cases: 3000, setup: (M, rnd) => { nearPete(M, rnd, cell); const i = rnd(4); return { a: [0xB5, 0x01, 0x5C, 0x5A][i], x: i + 1 }; }, outs: ['c'] });
check({ name: 'let_water_in', cases: 3000, setup: (M, rnd) => { nearPete(M, rnd, r => r(2) ? 0x6C : cell(r)); M[0x6B] = [0, 1, 2, 0x40][rnd(4)]; } });
check({ name: 'score_item', cases: 3000, setup: (M, rnd) => { M[0xAF] = rnd(2); return { a: 0x70 + rnd(0x30) }; } });
check({ name: 'add_score', cases: 3000, setup: (M, rnd) => { M[0xAF] = rnd(2); M[0xAD] = rnd(256); M[0xAE] = rnd(256); M[0xAA] = rnd(256); M[0xAB] = rnd(256); M[0xAC] = rnd(256); M[0xA9] = rnd(256); } });
check({ name: 'kill_bonus', setup: (M, rnd) => { M[0xB0] = rnd(3); } });
const goodie = (M, rnd) => {
  const k = 0x70 + rnd(0x30), p = 0x3952 + rnd(0x3F4C - 0x3952);
  M[0x65] = k; M[0x66] = p & 0xFF; M[0x67] = p >> 8; M[p] = k; M[0x69] = 1 + rnd(4);
  M[0x06] = 1 + rnd(88); M[0x07] = 4 + rnd(18);
  return { a: k };
};
check({ name: 'count_goodie', cases: 3000, setup: (M, rnd) => { const r = goodie(M, rnd); M[0xB5] = rnd(3); return r; } });
check({ name: 'clear_goodie', cases: 3000, setup: goodie });
check({ name: 'earth_at', setup: (M, rnd) => ({ x: rnd(256), y: rnd(256) }), outs: ['x', 'y'] });
check({ name: 'to_quarters', cases: 3000, setup: (M, rnd) => {
  M[0x15] = [0x00, 0x40, 0x80, 0xC0][rnd(4)]; M[0x27] = rnd(5); M[0x1A] = rnd(4);
  return { a: rnd(256), x: [0x0D, 0x0F, 0x1B, 0x1D][rnd(4)], y: rnd(6) };
} });
check({ name: 'creature_touch', cases: 4000, setup: (M, rnd) => {
  // creatures near Pete
  for (let i = 0; i < 4; i++) {
    M[0x23 + i] = rnd(3) ? 1 : 0;
    M[0x8A + i] = (M[0x06] + rnd(5) - 2) & 0xFF; M[0x8E + i] = (M[0x07] + rnd(5) - 2) & 0xFF;
    M[0x4B + i] = rnd(5); M[0x28 + i] = rnd(4);
  }
  if (rnd(2)) { M[0x4A] = 1 + rnd(4); M[0x27] = rnd(4); }
  nearPete(M, rnd, cell);
}, outs: ['c'] });
check({ name: 'death', cases: 300, poll: frame });
check({ name: 'check_death', cases: 3000, poll: frame, setup: (M, rnd) => {
  for (let i = 0; i < 4; i++) { M[0x23 + i] = rnd(4) ? 0 : 1; M[0x8A + i] = (M[0x06] + rnd(5) - 2) & 0xFF; M[0x8E + i] = (M[0x07] + rnd(5) - 2) & 0xFF; }
  if (rnd(2)) { M[0x4A] = 1 + rnd(4); M[0x27] = rnd(4); }
  nearPete(M, rnd, cell);
  const p = (M[0x2C] | M[0x2D] << 8) & 0x3FFF, q = (M[0x2E] | M[0x2F] << 8) & 0x3FFF;
  if (rnd(4) === 0) M[p] = cell(rnd); if (rnd(4) === 0) M[q] = cell(rnd);
} });
check({ name: 'pete_touches', cases: 3000, poll: frame, setup: (M, rnd) => {
  M[0xB0] = rnd(3) ? 0 : 1;
  if (rnd(2)) goodie(M, rnd); else M[0x65] = cell(rnd);
  for (let i = 0; i < 4; i++) M[0x23 + i] = rnd(6) ? 0 : 1;
} });
