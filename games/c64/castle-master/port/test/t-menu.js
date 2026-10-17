'use strict';
// The pause menu alone against the game's, from every moment, with keys pressed one a poll: back
// to the game, Q, the music switched, the keys shown in turn, and saves and loads (the device
// chosen, a name typed with mistakes and DEL). The KERNAL's routines are the same stand-ins on
// both sides (the port's own, src/g-save.js), each side's save is compared with the game's, and a
// load reads a file made from another moment, a file that is not a saved game, or none. The
// menu's waits are let through on both sides.
const { check, moments } = require('./check.js');
const { kernalHooks } = require('./kernal.js');
let f = 0, mismatch = 0, saves = 0;
const t = o => { f += check(Object.assign({ cases: 1200, outs: [] }, o)).fails ? 1 : 0; };
const w = (M, a) => M[a] | M[a + 1] << 8;
// key numbers by the code the game's keyboard table gives them
const KEYS = { S: 13, L: 42, F: 21, K: 37, Q: 62, T: 22, D: 18, RET: 1, DEL: 0, SPACE: 60, A: 10, W: 9, X: 23, Z: 12, '1': 56, '?': 55, '*': 49, R: 17 };
const LETTERS = ['A', 'W', 'X', 'Z', '1', 'R', 'S', 'L', 'T', 'D', 'SPACE', '?', '*'];
// a saved game made from a moment's memory, as the game lays one out
function fileOf(M) {
  const b = [0xCC, 0x87];
  for (let y = 0; y < 0x6A; y++) b.push(M[0x2406 + y]);
  const base = w(M, 0x109C), tab = w(M, 0x109E);
  for (let k = 0; k < M[0x9D00]; k++) {
    const ap = (w(M, tab + 2 * k) + base) & 0xFFFF;
    let o = ap + 8, n = M[ap + 1];
    do { b.push(M[o]); o += M[o + 8]; n = (n - 1) & 255; } while (n);
  }
  return Uint8Array.from(b);
}
// the case's script: keys for each poll, and the file a load finds
let cur = null, gameSaved = null;
const script = (rnd) => {
  const s = [];
  const pick = () => {
    const r = rnd(10);
    if (r < 2) return 'SPACE';
    if (r < 3) return 'Q';
    if (r < 4) return 'F';
    if (r < 6) return 'K';
    if (r < 8) return 'S';
    return 'L';
  };
  for (;;) {
    const k = pick();
    if (k === 'K') { for (let i = 1 + rnd(12); i; i--) s.push(['K']); continue; }
    if (k === 'F') { s.push(['F']); continue; }
    if (k === 'S' || k === 'L') {
      s.push(rnd(12) ? [k] : [k, k === 'S' ? 'X' : '1']);
      for (let i = rnd(3); i; i--) s.push([LETTERS[rnd(LETTERS.length)]]);
      s.push([rnd(2) ? 'T' : 'D']);
      for (let i = rnd(9); i; i--) s.push([rnd(4) ? LETTERS[rnd(LETTERS.length)] : 'DEL']);
      s.push(['RET']);
    } else s.push([k]);
    return s;
  }
};
const press = (game, ks) => { game.keys.clear(); for (const k of ks) game.keys.add(KEYS[k]); };
const POLLS = [0x794E, 0x7B39, 0x7BAF];
const hooks = {};
for (const a of POLLS) hooks[a] = () => { press(cur.game, cur.keys[Math.min(cur.i++, cur.keys.length - 1)]); };
for (const a of [0x79E5, 0x7A48, 0x7A72, 0x7310, 0x7331]) hooks[a] = c => { c.m[0x1063] = 0; };
// the KERNAL's routines on the game's side: the same as the port's
Object.assign(hooks, kernalHooks(() => cur.file, (name, out) => { gameSaved = { name, out }; }));
const all = moments();
const onPort = P => {
  cur.i = 0;
  P.io.load = () => cur.file;
  P.io.save = (n, b) => {
    saves++;
    if (!gameSaved || gameSaved.name !== n || gameSaved.out.length !== b.length || gameSaved.out.some((v, i) => v !== b[i])) mismatch++;
  };
  const g = P.RUN_INFORMATION_MENU;
  P.RUN_INFORMATION_MENU = function* (r) {
    const it = g(r); let s;
    while (!(s = it.next()).done) {
      if (!s.value) P.M[0x1063] = 0;
      else if (POLLS.includes(s.value.cp)) press(cur.game, cur.keys[Math.min(cur.i++, cur.keys.length - 1)]);
      yield s.value;
    }
    return s.value;
  };
};
t({ name: 'RUN_INFORMATION_MENU', onPort, hooks, cases: 2000, setup: (M, c, rnd) => {
  gameSaved = null;
  const other = all[rnd(all.length)].ram;
  const r = rnd(8);
  const file = r === 0 ? null : fileOf(other);
  if (file && r === 1) file[2] = rnd(256) & 0xFE;
  if (rnd(3) === 0) M[0x2457] = rnd(11);
  if (rnd(3) === 0) M[0x2454] = rnd(40);
  if (rnd(3) === 0) M[0x2455] = rnd(0x19);
  if (rnd(4) === 0) M[0x2467] = rnd(2) ? 0xFF : 0;
  M[0x1065] = 0; if (M[0x1081] === 8) M[0x1081] = 0;
  M[0x1379] = rnd(10) ? rnd(2) : 2;
  cur = { game: c.game, keys: script(rnd), i: 0, file };
  c.game.joy = 0x1F;
} });
t({ name: 'FORMAT_MENU_STATISTICS', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x2457] = rnd(3) ? rnd(11) : rnd(256); } });
t({ name: 'FORMAT_SPIRITS_DESTROYED_FOR_MENU', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x2454] = rnd(3) ? rnd(40) : rnd(256); } });
t({ name: 'FORMAT_SCORE_FOR_MENU', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { for (const a of [0x2442, 0x2443, 0x2444]) M[a] = rnd(256); } });
t({ name: 'SWAP_GAME_AND_KERNAL_ZERO_PAGE', outs: ['a', 'x'] });
console.log((mismatch ? 'FAIL ' : 'ok   ') + 'saved files: ' + (saves - mismatch) + '/' + saves + ' the same as the game\'s');
process.exitCode = f || mismatch ? 1 : 0;
