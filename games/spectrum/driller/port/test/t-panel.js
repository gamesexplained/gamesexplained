'use strict';
// The keys, the sensors, the scripts, the panel and the interrupt (g-panel.js) against the game's
// own: the moments play calls each routine, then keys and joystick held at random, the panel asked
// for every part, and scripts of random instructions.
const { check, prefetch } = require('./check.js');
const R = ['read_keys', 'process_sensors', 'run_script', 'update_panel', 'needle', 'bar', 'panel_copy', 'interrupt'];
prefetch(R.concat(['copy_view']), { per: 6 });
let fails = 0;
const ALL = Array.from({ length: 40 }, (_, k) => k);
fails += check({ name: 'read_keys', cases: 200, countdown: 0x8FC2, outs: ['a', 'cf'] }).fails;
fails += check({ name: 'read_keys', from: 'copy_view', cases: 600, countdown: 0x8FC2, outs: ['a', 'cf'], setup: (c, rnd) => {
  const n = rnd(4) ? rnd(4) : rnd(9);
  c.keys = []; for (let k = 0; k < n; k++) c.keys.push(ALL[rnd(40)]);
  c.joy = rnd(3) ? 0 : rnd(32);
  c.M[0x8FC5] = rnd(2) ? 2 : rnd(3);
  // the keys of the last call: none, others, or these (the repeat)
  c.M[0x940C] = rnd(2); c.M[0x940D] = rnd(6);
  for (let k = 0; k < 6; k++) c.M[0x940E + k] = rnd(256);
  c.M[0x8FC3] = rnd(20); c.M[0x8FC4] = rnd(10); c.M[0x8FC2] = rnd(4) ? 0 : rnd(10);
} }).fails;
// the same keys again, so that they repeat
fails += check({ name: 'read_keys', from: 'copy_view', cases: 300, countdown: 0x8FC2, outs: ['a', 'cf'], setup: (c, rnd) => {
  c.keys = [ALL[rnd(40)]]; if (rnd(2)) c.keys.push(ALL[rnd(40)]);
  c.joy = 0; c.M[0x8FC5] = 0;
  const codes = []; const rows = new Map();
  for (const k of c.keys) rows.set(k >> 3, (rows.get(k >> 3) || 0) | 1 << (k & 7));
  for (let r = 0; r < 8; r++) for (let b = 0; b < 5; b++) if ((rows.get(r) || 0) >> b & 1) codes.push(c.M[0x9414 + 5 * r + b]);
  c.M[0x940D] = codes.length; codes.forEach((v, k) => { c.M[0x940E + k] = v; });
  c.M[0x940C] = rnd(2); c.M[0x8FC3] = rnd(30); c.M[0x8FC4] = rnd(10); c.M[0x8FC2] = rnd(30);
} }).fails;
fails += check({ name: 'process_sensors', cases: 200, countdown: 0x8A21 }).fails;
fails += check({ name: 'process_sensors', from: 'copy_view', cases: 200, countdown: 0x8A21, setup: (c, rnd) => {
  c.M[0x8BF0] = rnd(2); c.M[0x8910] = rnd(2); c.M[0x8A21] = rnd(8);
  for (let k = 0; k < 5; k++) { c.M[0x8A29 + 6 * k] = rnd(3); c.M[0x8A47 + 6 * k] = rnd(256); }
} }).fails;
fails += check({ name: 'update_panel', cases: 200 }).fails;
fails += check({ name: 'update_panel', from: 'copy_view', cases: 600, setup: (c, rnd) => {
  c.M[0x8920] = rnd(256); c.M[0x8921] = rnd(256); c.M[0x891F] = rnd(3) ? 1 : 3;
  c.M[0x8875] = rnd(64); c.M[0x8878] = rnd(64); c.M[0x8A67] = rnd(64); c.M[0x8A68] = rnd(64);
  c.M[0x88C8] = rnd(4) ? rnd(0x48) : 0xFF; c.M[0x88C7] = rnd(4) ? rnd(0x48) : 0xFF;
  c.M[0x876D] = rnd(0x48); c.M[0x876C] = rnd(0x48); c.M[0x876F] = rnd(0x34);
  c.M[0x88AC] = rnd(2); c.M[0x877A] = rnd(2); c.M[0x8772] = 1 + rnd(4);
  if (rnd(3) === 0) c.M[0x8862] = 1 + rnd(0x16);
  for (let k = 0; k < 18; k++) if (rnd(4) === 0) c.M[0x877B + k] = rnd(4);
} }).fails;
fails += check({ name: 'bar', from: 'copy_view', cases: 300, setup: (c, rnd) => {
  c.regs.ix = rnd(2) ? 0xCFCE : 0xCFD1; c.regs.h = rnd(64); c.regs.l = rnd(64);
} }).fails;
fails += check({ name: 'needle', from: 'copy_view', cases: 300, setup: (c, rnd) => {
  c.regs.ix = c.M[0x8BE6 + 2 * rnd(2)] | c.M[0x8BE7 + 2 * rnd(2)] << 8; c.regs.a = rnd(0x48); c.M[0x88D8] = rnd(10);
} }).fails;
fails += check({ name: 'interrupt', cases: 300 }).fails;
fails += check({ name: 'interrupt', from: 'copy_view', cases: 600, setup: (c, rnd) => {
  c.M[0x88A3] = rnd(3) ? 0x31 : rnd(0x32); c.M[0x8BF2] = rnd(4) ? 0 : rnd(3);
  for (let k = 0; k < 8; k++) if (k !== 2 && k !== 5) c.M[0x88A4 + k] = 0x30 + (rnd(3) ? rnd(2) * 9 : rnd(10));
  c.M[0x8875] = rnd(5); c.M[0x8878] = rnd(5); c.M[0x8A21] = rnd(8); c.M[0x8A25] = rnd(6);
  for (let k = 0; k < 5; k++) {
    const e = 0x8A44 + 6 * k;
    c.M[e + 1] = 1 + rnd(8); c.M[e + 2] = rnd(c.M[e + 1]); c.M[e + 3] = rnd(3);
    c.M[e + 4] = rnd(190); c.M[e + 5] = rnd(110);
  }
} }).fails;
fails += check({ name: 'run_script', cases: 300, countdown: 0x8FC2 }).fails;
fails += check({ name: 'run_script', cases: 300, countdown: 0x8FC2, setup: (c, rnd) => { c.M[0x8BF1] = rnd(2); c.M[0x8A21] &= 0xFE; } }).fails;
// scripts of random instructions at $5B00, their operands near what the game's scripts hold
fails += check({ name: 'run_script', from: 'copy_view', cases: 800, countdown: 0x8FC2, setup: (c, rnd) => {
  const M = c.M, at = 0x5B00;
  let p = at;
  const ids = [];
  for (let o = M[0x8864] | M[0x8865] << 8, n = M[0x8863]; n > 0 && ids.length < 40; n--) { ids.push(M[o + 7]); o += M[o + 8]; }
  for (let k = 1 + rnd(4); k > 0; k--) {
    let op = 1 + rnd(0x21);
    if (op === 0x1A && rnd(3)) op = 9;
    const len = M[0x8939 + op] || 1;
    M[p] = op | (rnd(4) ? 0 : 0x80);
    for (let j = 1; j < len; j++) M[p + j] = rnd(256);
    if ([3, 4, 5, 0x10, 0x1E, 0x1F].includes(op) && ids.length) M[p + 1] = ids[rnd(ids.length)];
    if ([6, 7, 8, 0x11, 0x20, 0x21].includes(op)) { M[p + 1] = rnd(3) ? M[0x8862] : 1 + rnd(M[0xCF3E]); if (ids.length && rnd(2)) M[p + 2] = ids[rnd(ids.length)]; }
    if ([9, 0x0A, 0x0B, 0x14, 0x0C, 0x0D, 0x0E, 0x1D].includes(op)) { M[p + 1] = rnd(0x22); M[p + 2] = rnd(3); }
    if (op === 0x0F || op === 0x1C) M[p + 1] = 1 + rnd(21);
    if (op === 0x12) { M[p + 1] = 1 + rnd(M[0xCF3E]); M[p + 2] = 1 + rnd(4); }
    if (op === 0x1B) M[p + 1] = rnd(5);
    if (op === 1) M[p + 3] = rnd(2) ? 0 : 0xFF;
    if (op === 2 || op === 0x13) M[p + 1] = rnd(2) ? rnd(16) : 256 - rnd(16);
    p += len;
  }
  c.regs.ix = at; c.regs.a = p - at;
  M[0x8BF1] = rnd(2); M[0x8A21] &= 0xFE;
} }).fails;
process.exitCode = fails ? 1 : 0;
