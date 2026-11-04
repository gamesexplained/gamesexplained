'use strict';
// Saving and loading ($2AAE-$2C22, $93A8-$97AE) against the game's: the scrambling on random pages
// and seeds, the files' buffers on the records and leagues of moments of play, the name's check on
// names typed, the messages, the directory's screen on directories made as the drive sends them,
// and the save or the load itself on a store of files (files.js) with the controls played from a
// script (input.js). The KERNAL is src/kernal.js's on both sides.
const { check } = require('./check.js');
const { script, JOY, KEY } = require('./input.js');
const F = require('./files.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 300, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const S = script();
const io = { hooks: S.hooks, onPort: S.onPort };
const page = (M, rnd, at) => { for (let i = 0; i < 256; i++) M[at + i] = rnd(4) ? rnd(256) : 0; };
// SCRAMBLE_NEXT on any seed; the scrambling of pages of random bytes from any place in the run, and
// the unscrambling of pages scrambled (now and then changed by hand) and of random ones
T('SCRAMBLE_NEXT', { cases: 2000, setup: (M, c, rnd) => { M[0x96A6] = rnd(256); M[0x96A7] = rnd(256); }, outs: ['a', 'c'] });
const scrambled = (M, rnd, pages) => {
  const P = require('./check.js').portOn(M);
  M[0xF810] = rnd(256);
  if (pages === 2) P.SCRAMBLE_2({}); else P.SCRAMBLE({});
  if (rnd(3) === 0) M[0x4000 + rnd(256 * pages)] ^= 1 + rnd(255);
};
for (const [name, pages, un] of [['SCRAMBLE', 1, 0], ['UNSCRAMBLE', 1, 1], ['SCRAMBLE_2', 2, 0], ['UNSCRAMBLE_2', 2, 1]]) {
  T(name, { cases: 200, outs: ['a', 'c'], setup: (M, c, rnd) => {
    page(M, rnd, 0x4000); page(M, rnd, 0x4100);
    M[0xF810] = rnd(256); M[0xC39A] = rnd(2) ? 0 : 0x80;
    if (un && rnd(4)) { const m = M.slice(); scrambled(m, rnd, pages); for (let i = 0; i < 0x200; i++) M[0x4000 + i] = m[0x4000 + i]; }
  } });
}
T('SCRAMBLE_PAGE', { cases: 200, outs: ['a', 'c'], setup: (M, c, rnd) => {
  M[0x1E] = 0; M[0x1F] = 0x40 + rnd(2); page(M, rnd, M[0x1F] << 8);
  for (let x = 0; x < 256; x++) M[0x4300 + x] = M[0x4300 + ((x * 7) & 255)];
  { const m = M.slice(); require('./check.js').portOn(m).SCRAMBLE({}); for (let x = 0; x < 256; x++) M[0x4300 + x] = m[0x4300 + x]; }
  M[0x19] = rnd(2) ? 0x80 : 0; M[0xF810] = rnd(256);
} });
// the files' buffers: the Hall of Fame's records and a game for several, saved and loaded
const league = (M, rnd) => {
  M[0x31A1] = rnd(3) ? 1 + rnd(7) : 0;
  M[0xC77B] = rnd(2); M[0xC39A] = rnd(4) ? 0 : 0x80; M[0xC367] = [0, 0x40, 0x40, 1, 1, 0x80][rnd(6)];
  for (let i = 0; i < 16; i++) { const b = 0xDE00 + (rnd(2) << 8) + (rnd(16) << 4); M[b + 0x0C] = rnd(10); M[b + 0x0D] = rnd(0x60); M[b + 0x0E] = rnd(0x100); }
};
T('FILE_BUFFER', { cases: 400, outs: ['a', 'c'], setup: (M, c, rnd) => {
  league(M, rnd);
  page(M, rnd, 0x4000); page(M, rnd, 0x4100);
  if (rnd(3)) {
    const m = M.slice(); m[0xC77B] = 1; m[0xC39A] = 0;
    require('./check.js').portOn(m).FILE_BUFFER({ a: 1 });
    for (let i = 0; i < 0x200; i++) M[0x4000 + i] = m[0x4000 + i];
    for (let i = 0; i < 16; i++) { const b = 0xDE00 + (rnd(2) << 8) + (rnd(16) << 4); M[b + 0x0C] = rnd(10); M[b + 0x0D] = rnd(0x60); }
  }
  return { a: rnd(2) };
} });
T('LEAGUE_FILE', { cases: 300, outs: ['a', 'c'], setup: (M, c, rnd) => {
  league(M, rnd); page(M, rnd, 0x4000);
  if (!M[0xC77B] && rnd(3)) { const m = M.slice(); m[0xC77B] = 1; require('./check.js').portOn(m).LEAGUE_FILE({}); for (let i = 0; i < 256; i++) M[0x4000 + i] = m[0x4000 + i]; }
} });
// the name's check on names of every kind, for a save and a load, with one player or several; the
// refusal's key from the script
const NAMES = ['DIR ', 'DIRX', 'HALL', 'HALT', 'MP', 'MQ', 'M', 'ABC', 'D', 'DI'];
const name = (M, rnd) => {
  let s = NAMES[rnd(NAMES.length)];
  while (s.length < 12) s += rnd(3) ? ' ' : String.fromCharCode(0x41 + rnd(26));
  for (let i = 0; i < 12; i++) M[0xAEC1 + i] = s.charCodeAt(i);
};
T('FILE_NAME_CHECK', Object.assign({ outs: ['a', 'c'], setup: (M, c, rnd) => {
  name(M, rnd); M[0xC77B] = rnd(2); M[0x31A1] = rnd(2) ? 0 : 1 + rnd(7);
  S.start(c.game, [{ len: 5 + rnd(100), keys: [] }], [{ len: 90, keys: [KEY.RETURN] }, { len: 10, keys: [] }]);
} }, io));
T('FILE_MESSAGE', { setup: (M, c, rnd) => ({ x: [0, 0x0B, 0x57, 0x71, 0x99, rnd(0xA8)][rnd(6)], y: rnd(25) }), outs: ['a', 'x', 'y'] });
const FIRE = [{ len: 40, keys: [], joy: JOY.none }, { len: 40, keys: [KEY.RETURN], joy: JOY.fire }];
T('FILE_RESULT', Object.assign({ cases: 100, outs: ['a'], setup: (M, c, rnd) => {
  M[0xC39A] = [0, 0x80, 0x81][rnd(3)]; M[0xC367] = [0, 0x40, 1, 0x80][rnd(4)]; M[0xC77B] = rnd(2);
  name(M, rnd); S.start(c.game, [{ len: rnd(60), keys: [], joy: rnd(2) ? JOY.fire : JOY.none }], FIRE);
} }, io));
// the directory's screen, on directories of files named twelve characters (the game's) and others,
// up to three screens of them
T('DIRECTORY_SCREEN', Object.assign({ cases: 60, setup: (M, c, rnd) => {
  const K = globalThis.SCRKernal, st = new K.Store();
  for (let i = rnd(4) ? rnd(30) : rnd(150); i; i--) {
    let s = ''; for (let n = rnd(4) ? 12 : 1 + rnd(16); n; n--) s += String.fromCharCode(rnd(4) ? 0x41 + rnd(26) : 0x20 + rnd(0x40));
    st.save(s, 8, new Uint8Array(2 + rnd(3000)));
  }
  const b = K.DIRECTORY(st, 8);
  for (let i = 2; i < b.length && 0x4000 + i - 2 < 0x6000; i++) M[0x4000 + i - 2] = b[i];
  S.start(c.game, [{ len: rnd(60), keys: [], joy: JOY.none }], FIRE);
} }, io));
// the drive's commands: initialise, and the old file scratched before a save, on a store with the
// name and without
T('DISK_COMMAND', { cases: 200, outs: ['c'], port: 0x36, files: F.files, setup: (M, c, rnd) => {
  M[0x0840] = rnd(2); M[0xC77B] = rnd(2);
  F.plan(rnd);
  const n = F.names.length && rnd(2) ? F.names[rnd(F.names.length)].name : 'ABCDEFGHIJKL';
  for (let i = 0; i < 12; i++) M[0xAEC1 + i] = n.charCodeAt(i);
  return { x: rnd(2) ? 0 : 0x80 };
} });
// the save or the load: the tape or the disc, a save or a load, one player or several; a name typed
// from the script (one of the store's, a directory, the Hall of Fame, a game for several), then
// Return with fire, and the C= key, over and over
T('SAVE_OR_LOAD', Object.assign({ cases: 300, maxSteps: 1e8, files: F.files, setup: (M, c, rnd) => {
  M[0x0840] = rnd(2); M[0xC77B] = rnd(2); M[0x31A1] = rnd(2) ? 0 : 1 + rnd(7); M[0xC39A] = 0;
  F.plan(rnd);
  const steps = M[0xC77B] ? [...FIRE] : [];
  steps.push(...F.typeName(rnd));
  S.start(c.game, steps, F.LOOP);
} }, io));
process.exitCode = f ? 1 : 0;
