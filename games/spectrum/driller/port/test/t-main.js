'use strict';
// The main program's routines and the screens over the view (g-main.js, g-menu.js) against the
// game's own: the moments play calls each, then commands from keys held at random and in the
// demonstration, the information screen left by each kind of key, a game saved and loaded under a
// name typed, the control options and the security question answered (wrongly, then rightly).
const { check, prefetch } = require('./check.js');
const lib = require('./lib.js');
const R = ['take_commands', 'run_scripts', 'new_game', 'set_start', 'info_screen', 'control_options', 'security', 'filename', 'checksum', 'clear_view'];
prefetch(R.concat(['copy_view']), { per: 6 });
let fails = 0;
const KEY = lib.KEY;
// keys held in turn as the keyboard is scanned: each step a key name, a list of them, or [] for
// none, held for `scans` scans
const seq = (steps, scans = 3) => steps.map(s => ({ keys: (Array.isArray(s) ? s : [s]).map(k => KEY[k]), scans }))
  .concat([{ keys: [], scans: 1e9 }]);
// the same, the last step held for good
const seqHeld = steps => seq(steps).slice(0, -1).map((s, i, a) => (i === a.length - 1 ? Object.assign(s, { scans: 1e9 }) : s));
const typing = (word, scans) => [].concat(...[...word].map(ch => [ch === ' ' ? 'SPACE' : ch, []]));
// the word the security question asks for in a case's memory, as the frame counter stands
function word(M) {
  let iy = 0xABC1;
  for (let b = M[0x8A1D] & 0x7F; b > 0; b--) iy = (iy + ((M[iy] + 4) & 255)) & 0xFFFF;
  let w = '';
  for (let i = 0; i < M[iy]; i++) w += String.fromCharCode(((M[iy + 4 + i] & 0xBF) | 0x80) >> 1);
  return w;
}
// a tape holding a save of the case's own game, with its score changed
function saveOf(M, name) {
  const buf = [];
  for (let k = 0; k < 0x14D; k++) buf.push(M[0x8762 + k]);
  buf[0x8872 - 0x8762] ^= 0x55;
  let iy = M[0x8914] | M[0x8915] << 8;
  for (let c = M[0xCF3E]; c > 0; c--) {
    let ix = ((M[0x8912] | M[0x8913] << 8) + (M[iy] | M[iy + 1] << 8)) & 0xFFFF; iy += 2;
    const n = M[ix + 1]; ix += 0x19;
    for (let b = n; b > 0; b--) { buf.push(M[ix] ^ (b === 1 ? 0x40 : 0)); ix = (ix + M[ix + 8]) & 0xFFFF; }
  }
  let b = 0, c = 0;
  for (let i = 0; i < buf.length; i++) if (i & 1) c ^= buf[i]; else b ^= buf[i];
  let cy = b >> 7; b = (b << 1) & 255;
  let n = c >> 7; c = ((c << 1) | cy) & 255; cy = n;
  n = b >> 7; b = ((b << 1) | cy) & 255; cy = n;
  c = ((c << 1) | cy) & 255;
  const v = b << 8 | c;
  const head = [0x1B].concat([...name.padEnd(12, ' ')].map(ch => ch.charCodeAt(0)), [buf.length & 255, buf.length >> 8, M[0xCF3F], M[0xCF40], v & 255, v >> 8]);
  return [{ flag: 0, bytes: head }, { flag: 0xFF, bytes: buf }];
}
const tape = blocks => c => ({ blocks: (blocks ? blocks(c) : []).slice(), save() { return true; }, load() { return this.blocks.shift() || null; } });

fails += check({ name: 'checksum', from: 'copy_view', outs: ['bc'], cases: 200, setup: (c, rnd) => { c.regs.d = 0x60 + rnd(0x90); c.regs.e = rnd(256); c.regs.h = 0; c.regs.l = 1 + rnd(255); if (rnd(2)) c.regs.h = rnd(3); } }).fails;
fails += check({ name: 'clear_view', from: 'copy_view', cases: 30 }).fails;
fails += check({ name: 'new_game', cases: 50 }).fails;
fails += check({ name: 'new_game', from: 'copy_view', cases: 30 }).fails;
fails += check({ name: 'set_start', from: 'copy_view', cases: 400, setup: (c, rnd) => {
  c.M[0x8862] = rnd(8) ? 1 + rnd(c.M[0xCF3E]) : 0x7F; c.M[0x8911] = rnd(4) ? 1 + rnd(4) : rnd(20);
  if (rnd(2)) c.M[0x88B5] = [0, 0x7E, rnd(0x7F)][rnd(3)];
  if (rnd(2)) c.M[0x88B7] = [0, 0x7E, rnd(0x7F)][rnd(3)];
  c.M[0x877A] = rnd(2);
} }).fails;
fails += check({ name: 'run_scripts', cases: 300, countdown: 0x8FC2 }).fails;
fails += check({ name: 'run_scripts', from: 'copy_view', cases: 300, countdown: 0x8FC2, setup: (c, rnd) => {
  c.M[0x8A64] = 1; c.M[0x8A21] &= 0xFE; c.M[0x8BF1] = rnd(2); c.M[0x8A1E] = rnd(2);
  const ids = [];
  for (let o = c.M[0x8864] | c.M[0x8865] << 8, n = c.M[0x8863]; n > 0; n--) { ids.push(c.M[o + 7]); o += c.M[o + 8]; }
  c.M[0x8A69] = rnd(4) && ids.length ? ids[rnd(ids.length)] : rnd(4);
} }).fails;
// a pass's commands: keys held from those the game knows, the demonstration, the game over
const GAMEKEYS = ['O', 'K', 'Q', 'W', 'P', 'L', '0', 'R', 'F', 'U', 'N', 'M', 'A', 'Z', 'S', 'X', 'C', 'D', 'I', 'H', 'T', 'B', 'SPACE', '1', '2', '3'];
fails += check({ name: 'take_commands', cases: 300, countdown: 0x8FC2, setup: (c, rnd) => {
  c.keys = []; for (let k = 1 + rnd(2); k > 0; k--) c.keys.push(KEY[GAMEKEYS[rnd(GAMEKEYS.length)]]);
  c.M[0x8A21] &= 0xFE; c.M[0x940D] = 0;
} }).fails;
fails += check({ name: 'take_commands', from: 'copy_view', cases: 200, countdown: 0x8FC2, setup: (c, rnd) => {
  c.keys = []; for (let k = 1 + rnd(3); k > 0; k--) c.keys.push(KEY[GAMEKEYS[rnd(GAMEKEYS.length)]]);
  c.M[0x8A21] &= 0xFE; c.M[0x940D] = 0; c.M[0x88AC] = rnd(2);
  if (rnd(5) === 0) c.M[0x88AE] ^= 1;
  if (rnd(6) === 0) { c.M[0x8BF2] = 1 + rnd(6); c.keys = rnd(2) ? [] : c.keys; }
} }).fails;
fails += check({ name: 'take_commands', from: 'copy_view', cases: 200, countdown: 0x8FC2, setup: (c, rnd) => {
  c.M[0x891F] = 3; c.keys = rnd(5) ? [] : [KEY.SPACE]; c.M[0x940D] = 0; c.M[0x8A21] &= 0xFE;
  const start = c.M[0x8924] | c.M[0x8925] << 8;
  const at = (start + rnd(200)) & 0xFFFF;
  c.M[0x8927] = at & 255; c.M[0x8928] = at >> 8; c.M[0x8926] = rnd(3) ? 0 : rnd(5);
} }).fails;
// the information screen, left by a key, by 1, or by a save or a load under a name typed
const info = (steps, blocks, held) => ({ name: 'info_screen', from: 'copy_view', cases: 20, countdown: 0x8FC2, tape: tape(blocks),
  setup: (c, rnd) => {
    c.M[0x8FBC] = 1; c.M[0x8A21] = 0; c.M[0x940D] = 0;
    const area = c.M[0x8862];
    if (area >= 1 && area < 0x13) { c.M[0x877B + area - 1] = rnd(4); c.M[0x878D + area - 1] = rnd(101); c.M[0x879F] = 1; c.M[0x87A3] = 0xEB + rnd(16); c.M[0x87A4] = 0x88; }
    c.seq = (held ? seqHeld : seq)(steps(c));
  } });
fails += check(info(() => [[], 'X', []])).fails;
fails += check(info(() => [[], '1', []])).fails;
fails += check(info(() => [[], 'S', []].concat(typing('AB'), ['ENTER', [], 'X', []]))).fails;
fails += check(info(() => [[], 'S', []].concat(['ENTER', [], 'X', []]))).fails;
fails += check(info(c => [[], 'L', []].concat(typing('DRILL'), ['ENTER', []], typing(word(c.M).toUpperCase()), ['ENTER', []]),
  c => saveOf(c.M, 'DRILL'))).fails;
fails += check(info(c => [[], 'L', []].concat(['ENTER', []], typing(word(c.M)), ['ENTER', []]), c => saveOf(c.M, 'OTHER'))).fails;
// a name no file has: the tape runs out, and SPACE stops the load
fails += check(info(() => [[], 'L', []].concat(typing('X'), [['ENTER', 'SPACE']]), c => saveOf(c.M, 'OTHER'), true)).fails;
// the control options, each chosen
for (const k of ['1', '2', '3', '4']) {
  fails += check({ name: 'control_options', from: 'copy_view', cases: 10, countdown: 0x8FC2, setup: c => { c.M[0x940D] = 0; c.seq = seq([[], '5', [], k, [], 'ENTER', []]); } }).fails;
}
// the security question: the right word, and a wrong one first
fails += check({ name: 'security', from: 'copy_view', cases: 40, countdown: 0x8FC2, setup: (c, rnd) => {
  c.M[0x940D] = 0; c.M[0x8A1D] = rnd(256);
  c.seq = seq([[]].concat(typing(word(c.M)), ['ENTER', []]));
} }).fails;
fails += check({ name: 'security', from: 'copy_view', cases: 20, countdown: 0x8FC2, setup: (c, rnd) => {
  c.M[0x940D] = 0; c.M[0x8A1D] = rnd(256);
  const M2 = c.M.slice();
  c.seq = seq([[]].concat(typing('WRONG'), [['CAPS', '0'], []], ['ENTER', []], typing(word(M2)), ['ENTER', []]));
} }).fails;
fails += check({ name: 'filename', from: 'copy_view', cases: 20, countdown: 0x8FC2, outs: ['a', 'hl'], setup: (c, rnd) => {
  c.M[0x940D] = 0; c.seq = seq([[]].concat(typing('MY GAME 1'), [['CAPS', '0'], []], ['ENTER', []]));
} }).fails;
process.exitCode = fails ? 1 : 0;
