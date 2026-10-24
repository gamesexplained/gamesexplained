'use strict';
// The interrupt's routines (src/g-irq.js), each checked alone against the game's (check.js), on the
// moments of play: the whole handler, with each input routine and each person's turn at random,
// and the routines it calls.
//   node t-irq.js [cases] [routine]
const { check } = require('./check.js');

const STACK = [[0x100, 0x1FF]];
const INPUTS = [0x54F1, 0x5526, 0x5570, 0x562C, 0x5630];
// a person's turn: irq_entity ($66D1) and their record at ($45)
function turn(M, rnd, e = rnd(50)) {
  const r = 0xCA0E + 18 * e;
  M[0x66D1] = e; M[0x45] = r & 255; M[0x46] = r >> 8;
  return e;
}
// the joystick or keys held, the cursor anywhere on the screen
function input(M, c, rnd) {
  c.game.joy1 = rnd(3) ? 0x1F : 0x1F & ~rnd(32);
  c.vic[0] = rnd(256); c.vic[1] = 0x90 + rnd(0x70); c.vic[0x10] = rnd(2);
  M[0x68E5] = rnd(0xA8); M[0x68E4] = 1 + rnd(20); M[0x68E3] = 1 + rnd(10);
  M[0x68E2] = 2 + rnd(5); M[0x68E1] = 2 + rnd(5);
}
// The state stirred so that the rarer turns come up: a person's status, timer, destination,
// strength and patrol; the bars, the time delay, the scan, the triggers, the general found; the
// ticker between messages, the destruct count and the clock about to carry; the end of a round.
function stir(M, c, rnd) {
  const e = turn(M, rnd, rnd(4) ? rnd(50) : [0, 4, 6, 7, 8, 13, 49][rnd(7)]);
  const R = 0xCA0E + 18 * e, any = () => M[0xCA0E + 18 * rnd(50) + 2];
  if (rnd(2)) M[R] = [0, 1, 1, 4, 5, 8, 0x0C, 0x0C, 0x10, 0x11, 2][rnd(11)];
  if (rnd(2)) M[R + 1] = 1 + rnd(2);
  if (rnd(3) === 0) M[R + 3] = [0xA3, M[0x68EA + rnd(6)], M[0xCA7C], any()][rnd(4)];
  if (rnd(4) === 0) M[R + 4] = rnd(3) ? rnd(4) : 0xFF;
  if (rnd(3) === 0) M[R + 7] = (rnd(2) << 7) | (rnd(2) << 6) | rnd(8);
  if (rnd(3) === 0) M[R + 5] = (rnd(2) << 7) | (rnd(2) << 6) | rnd(4);
  if (rnd(4) === 0) M[R + 2] = M[0xCA0E + 18 * rnd(6) + 2];
  M[0x66CC] = rnd(2); M[0x66CD] = rnd(2);
  for (let x = 0; x < 5; x++) if (rnd(2)) M[0x66BE + x] = rnd(0x60);
  if (rnd(6) === 0) { M[0xCF83] = 1 + rnd(2); M[0xCF84] = rnd(2) ? e : rnd(6); } else M[0xCF83] = 0;
  M[0x8189] = rnd(2); if (rnd(2)) M[0x5446] = rnd(2) ? M[R + 3] : M[R + 2];
  if (rnd(3) === 0) for (let x = 0; x < 8; x++) M[0x5457 + x] = rnd(2) ? 0xFF : rnd(50);
  M[0xCF80] = rnd(2); if (rnd(4) === 0) M[0xCA7A] = rnd(2) ? 2 : 0;
  if (rnd(3) === 0) M[0x66D0] = rnd(2) ? 8 * rnd(32) : rnd(256);
  if (rnd(3) === 0) { M[0x66D8 + M[0x66CF]] = 0x38; if (rnd(2)) M[0x67F9] = (M[0x67FA] + 15) & 15; }
  if (rnd(3) === 0) { M[0x66D1] = 0x31; const r = 0xCA0E + 18 * 49; M[0x45] = r & 255; M[0x46] = r >> 8; }
  if (rnd(3) === 0) { M[0xCA06] = 1; M[0xCA07] = [1, 2, M[0x68E6 + rnd(4)] + 1, 9][rnd(4)]; }
  if (rnd(2)) {
    M[0xCA04] = rnd(2);
    for (let k = 0; k < 4; k++) M[0xCA00 + k] = rnd(2) ? (M[0xCA04] ? [9, 5, 9, 9][k] : 0) : rnd(10);
  }
  // people weak enough to die of the next blow, and the dead counted to the 34th
  if (rnd(3) === 0) for (let n = 0; n < 50; n++) if (rnd(3) === 0) M[0xCA0E + 18 * n + 4] = rnd(3);
  if (rnd(4) === 0) { M[0xCF68] = rnd(2) ? 3 : 9; M[0xCF67] = 4; M[0xCF4C] = 1 + rnd(2); }
  M[0x68B1] = rnd(8); M[0x6C8C] = rnd(2); M[0x68B0] = rnd(8) ? 0 : 1;
}
// one person's turn, at peace, with the time delay off and the game running
function calm(M, rnd, e) {
  turn(M, rnd, e);
  M[0xCF83] = 0; M[0x68B0] = 0; M[0x8189] = 0;
  return 0xCA0E + 18 * e;
}
// a patrol at its end: forwards at the script's last place, or backwards at its first
function patrolEnd(M, rnd, e, chain) {
  const R = calm(M, rnd, e);
  M[R] = 0; M[R + 1] = 1;
  const k = (M[R + 8] << 1) & 255, p = M[0xBDC0 + k] | M[0xBDC1 + k] << 8;
  M[R + 7] = rnd(2) ? 0x80 | ((M[p] - 2) & 0x3F) : 0xC0 | rnd(2);
  M[R + 5] = (M[R + 5] & 0x7F) | (chain ? 0x80 : 0);
}
// the handler's RTI stands for the RTS that ends a call
const RTI = { 0x63D6: c => { c.pc = 0xFFFF; return false; } };
const CHECKS = [
  { name: 'irq', outs: [], cases: 8000, hooks: RTI, setup: (M, c, rnd) => {
    turn(M, rnd);
    const a = INPUTS[rnd(INPUTS.length)];
    M[0x54EF] = a & 255; M[0x54F0] = a >> 8;
    input(M, c, rnd);
    if (rnd(4)) stir(M, c, rnd);
  } },
  // turns the stirring seldom reaches: Kryxix (4) finds the general; Zoff (7) at the end of his
  // patrol escapes; a guard at the end of a patrol in a chain goes on to the next; a message with a
  // new line comes into the ticker
  { name: 'irq', outs: [], cases: 300, hooks: RTI, setup: (M, c, rnd) => {
    const R = calm(M, rnd, 4);
    M[R] = 1; M[R + 1] = 1; M[R + 3] = M[0xCA7C]; M[0xCF80] = 0; M[0xCA7A] = 0;
  } },
  { name: 'irq', outs: [], cases: 300, hooks: RTI, setup: (M, c, rnd) => patrolEnd(M, rnd, 7, false) },
  { name: 'irq', outs: [], cases: 600, hooks: RTI, setup: (M, c, rnd) => patrolEnd(M, rnd, 8 + rnd(42), true) },
  { name: 'irq', outs: [], cases: 300, hooks: RTI, setup: (M, c, rnd) => {
    calm(M, rnd, 4 * rnd(12));
    M[0x66D0] = 6; M[0x66D8 + M[0x66CF]] = 0x38;
    const q = M[0x67F9];
    M[0x67FA] = (q + 1) & 15; M[0x67D8 + q] = 0x40; M[0x67E8 + q] = 0x03;
    M.set([0x01, 0x39, 0x02, 0x81, 0x39, 0x38], 0x0340);
  } },
  // a team member carrying far more than their strength allows
  { name: 'irq', outs: [], cases: 300, hooks: RTI, setup: (M, c, rnd) => {
    const R = calm(M, rnd, rnd(6));
    M[R] = 0; M[R + 4] = rnd(4); M[R + 7] = 0xFC + rnd(4);
  } },
  { name: 'input_lightpen', outs: [], hooks: { 0x5754: c => { c.rts(); return false; } }, setup: (M, c, rnd) => {
    input(M, c, rnd); c.vic[0x13] = rnd(256); c.vic[0x14] = rnd(256);
  } },
  { name: 'input_paddles', outs: [], hooks: { 0x5754: c => { c.rts(); return false; } }, setup: input },
  { name: 'clamp_cursor_y', outs: [], hooks: { 0x5754: c => { c.rts(); return false; } }, setup: (M, c, rnd) => { input(M, c, rnd); return { a: rnd(256) }; } },
  { name: 'unused_place_icon', outs: ['x', 'y'], setup: (M, c, rnd) => {
    const n = rnd(0xA4), y = (n << 1) & 255, p = n & 0x80 ? M[0xB2E4 + y] | M[0xB2E5 + y] << 8 : M[0xB1E4 + y] | M[0xB1E5 + y] << 8;
    M[0x2D] = p & 255; M[0x2E] = p >> 8;
    M[0x6C96] = (M[p] - rnd(3)) & 255; M[0x6C97] = (M[p + 1] - rnd(3)) & 255;
    M[0x31] = M[0x8D32]; M[0x32] = M[0x8D33]; M[0x4A1E] = 0;
  } },
  { name: 'clock_wraps', outs: [], hooks: { 0x637E: c => { c.rts(); return false; } } },
  { name: 'input_joystick', outs: [], hooks: { 0x5754: c => { c.rts(); return false; } }, setup: input },
  { name: 'input_keyboard', outs: [], hooks: { 0x5754: c => { c.rts(); return false; } }, setup: input },
  { name: 'input_demo', outs: [], hooks: { 0x5754: c => { c.rts(); return false; } }, setup: (M, c, rnd) => {
    input(M, c, rnd);
    M[0x6933] = rnd(2) ? 0 : 0x78; M[0x6930] = rnd(3) ? 1 + rnd(3) : 0x78;
    M[0x6931] = 2 * rnd(0x37);
    if (rnd(2)) { M[0x692E] = M[0x68E5]; M[0x692F] = c.vic[1]; }
  } },
  { name: 'queue_message', outs: ['a', 'x', 'y'] },
  { name: 'icon_offset', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => ({ x: rnd(9) }) },
  { name: 'team_member_at', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => ({ a: rnd(2) ? M[0xCA0E + 18 * rnd(6) + 2] : rnd(0xA4) }) },
  { name: 'list_reachable', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { turn(M, rnd); } },
  { name: 'kill_entity', outs: ['a', 'y'], setup: (M, c, rnd) => { turn(M, rnd); } },
  { name: 'next_patrol', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
    // a person whose record has a chain of patrols
    for (let k = 0; k < 100; k++) { const e = turn(M, rnd, 8 + rnd(42)); if (M[0xCA0E + 18 * e + 5] & 0x80) break; }
  } },
  { name: 'ticker_shift', outs: ['a', 'x'] },
  { name: 'bar_step', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
    const x = rnd(5);
    M[0x2B] = M[0x66AA + x]; M[0x2C] = M[0x66AF + x]; M[0x2D] = M[0x66B4 + x]; M[0x2E] = M[0x66B9 + x];
    M[0x66BE + x] = rnd(0x60);
    return { a: rnd(4), x };
  } },
  { name: 'trigger_zoff', outs: ['a'] },
  { name: 'trigger_squad', outs: ['a', 'x', 'y'] },
  { name: 'trigger_8a', outs: ['a'] }, { name: 'trigger_8b', outs: ['a'] },
  { name: 'trigger_9a', outs: ['a'] }, { name: 'trigger_9b', outs: ['a'] },
  { name: 'unused_in_window', outs: ['a', 'y', 'c'], setup: (M, c, rnd) => {
    const n = rnd(0xA4), y = (n << 1) & 255, p = n & 0x80 ? M[0xB248 + y] | M[0xB249 + y] << 8 : M[0xB1E4 + y] | M[0xB1E5 + y] << 8;
    if (rnd(2)) { M[0x6C92] = (M[p] - rnd(3)) & 255; M[0x6C94] = (M[p] + rnd(3)) & 255; M[0x6C93] = (M[p + 1] - rnd(3)) & 255; M[0x6C95] = (M[p + 1] + rnd(3)) & 255; }
    return { a: n };
  } },
  { name: 'clamp_cursor', outs: [], hooks: { 0x5754: c => { c.rts(); return false; } }, setup: input },
];
if (require.main === module) {
  const cases = +(process.argv[2] || 2000), only = process.argv[3];
  let fails = 0;
  for (const o of CHECKS) {
    if (only && o.name !== only) continue;
    fails += check(Object.assign({ cases: Math.min(cases, o.cases || cases), ignore: STACK }, o)).fails;
  }
  process.exitCode = fails ? 1 : 0;
}
module.exports = { CHECKS };
