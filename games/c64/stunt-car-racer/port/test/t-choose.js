'use strict';
// The main menu and its choosers ($ED7F-$F020, $98A2) against the game's, each on moments of play
// with the league stirred and the controls played from a script (input.js): random presses of the
// stick, its fire, the menus' number keys, the five keys of the controls and others first, then
// fire pressed and let go over and over, so that every chooser in the end takes the line lit.
const { check } = require('./check.js');
const { script, fromGame, JOY, KEY, typed, nameKey } = require('./input.js');
const F = require('./files.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const S = script();
const io = { hooks: S.hooks, onPort: S.onPort };
// the keys a menu might see: its number keys, the controls' five, Return (fire outside a race), F1
const menuKeys = M => [...[0, 1, 2, 3].map(i => fromGame(M[0xF80C + i])), ...[0, 1, 2, 3, 4].map(i => fromGame(M[0xF807 + i])), KEY.RETURN, KEY.F1, KEY.CBM];
const presses = (M, rnd, n) => {
  const keys = menuKeys(M), out = [];
  for (let i = rnd(n + 1); i; i--) {
    if (rnd(4)) out.push({ len: 15 + rnd(30), keys: [], joy: JOY.none });
    out.push({ len: 5 + rnd(60), keys: rnd(3) ? [] : [keys[rnd(keys.length)]], joy: [JOY.none, JOY.up, JOY.down, JOY.left, JOY.right, JOY.fire][rnd(6)] });
  }
  return out;
};
const FIRE = [{ len: 40, keys: [], joy: JOY.none }, { len: 40, keys: [KEY.RETURN], joy: JOY.fire }];
// the stirring the lists need: the strings of the menus or of $E000, the division, the track's place
const stir = (M, c, rnd) => {
  M[0x31A0] = rnd(2) ? 0x80 : 0;
  M[0x31A7] = rnd(4); M[0xC718] = rnd(4); M[0xC71A] = rnd(3) ? 0 : 1;
  M[0x31A1] = rnd(3) ? 0 : 1 + rnd(7);
  M[0x3DF8] = [0x80, 0, 0x41, 0xC1][rnd(4)];
};
// the lists the game shows: the first string's place (X), the last line (Y) and the line lit
const LISTS = [[0, 3, 1], [0, 3, 2], [4, 3, 3], [8, 2, 0], [8, 2, 1], [0x0C, 2, 0], [0x0C, 2, 1], [0x18, 3, 0], [0x18, 3, 3], [0x1C, 2, 0], [0x1C, 2, 1], [0x10, 1, 0], [0x14, 1, 0]];
T('MENU_CHOICE', Object.assign({ outs: ['a'], setup: (M, c, rnd) => {
  stir(M, c, rnd);
  S.start(c.game, presses(M, rnd, 6), FIRE);
  const [x, y, a] = LISTS[rnd(LISTS.length)];
  return { x, y, a };
} }, io));
T('PRACTICE_TRACK', Object.assign({ cases: 100, outs: ['a'], setup: (M, c, rnd) => {
  stir(M, c, rnd);
  M[0x31A8] = rnd(2); M[0xC76C] = rnd(2);
  S.start(c.game, presses(M, rnd, 6), FIRE);
} }, io));
// a name typed: letters, figures and the rest, with a shift held now and then, rubbing out, the
// C= key and keys that do not count; then Return
const nameSteps = (rnd, n) => {
  const out = [], chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./: ';
  for (let i = rnd(n + 1); i; i--) {
    const w = rnd(10);
    let keys = [nameKey(chars[rnd(chars.length)])];
    if (w === 0) keys = [KEY.DEL];
    else if (w === 1) keys = [rnd(64)];
    else if (w === 2) keys.push(KEY.LSHIFT);
    else if (w === 3 && !rnd(3)) keys = [KEY.CBM];
    out.push(...typed(rnd, keys));
  }
  return out;
};
const RETURN = [{ len: 90, keys: [KEY.RETURN] }, { len: 10, keys: [] }];
T('NAME_ENTRY_AT', Object.assign({ outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
  S.start(c.game, nameSteps(rnd, 16), RETURN);
  const [x, y] = [[0x64, 0xBD], [0x78, 0xD5]][rnd(2)];
  return { a: [0xC0, ((0x0B - rnd(8)) << 4) & 255, rnd(256)][rnd(3)], x, y };
} }, io));
T('NAME_ENTRY', Object.assign({ cases: 100, outs: ['a', 'x', 'y'], setup: (M, c, rnd) => {
  M[0x31A1] = rnd(8);
  S.start(c.game, nameSteps(rnd, 14), RETURN);
} }, io));
// the main menu: a plan of its choices, each a line lit with its number key and taken with fire: the
// Hall of Fame; a save or a load of a file on the tape or the disc, its name typed (one of the
// store's now and then); the season replayed, with F1 held now and then to start again; a practice
// race; then fire and the C= key over and over. The quit to START ($3B22) stops the game there,
// and the port's P.RESTART is caught
const pick = (M, i, also = []) => [{ len: 30, keys: [] }, { len: 30, keys: [fromGame(M[0xF80C + i])] }, { len: 30, keys: [] }, { len: 40, keys: [KEY.RETURN, ...also], joy: JOY.fire }];
const fire = [{ len: 40, keys: [], joy: JOY.none }, { len: 40, keys: [KEY.RETURN], joy: JOY.fire }];
const PLANS = {
  hall: (M, rnd) => [...pick(M, 0), ...fire],
  file: (M, rnd) => {
    const save = rnd(2);
    return [...pick(M, 3), ...pick(M, save ? 1 : 0), ...pick(M, rnd(3)), ...(save ? fire : []), ...F.typeName(rnd),
      { len: 90, keys: [KEY.RETURN], joy: JOY.fire }, { len: 20, keys: [] }, ...fire];
  },
  replay: (M, rnd) => [...pick(M, 3), ...pick(M, 2, rnd(3) ? [] : [KEY.F1])],
  cancel: (M, rnd) => [...pick(M, 3), ...pick(M, 3)],
  practice: (M, rnd) => [...pick(M, 1), ...pick(M, rnd(4)), ...pick(M, rnd(3))],
  presses: (M, rnd) => presses(M, rnd, 3),
};
const PLAN = ['hall', 'file', 'file', 'file', 'replay', 'cancel', 'practice', 'presses'];
T('MAIN_MENU', { cases: 300, maxSteps: 1e8, files: F.files,
  setup: (M, c, rnd) => {
    stir(M, c, rnd);
    M[0x31A8] = rnd(4) ? 0 : 1; M[0xC76C] = [0, 1, 0x80, 0x81][rnd(4)];
    M[0x0840] = rnd(2); M[0xC77E] = rnd(256);
    F.plan(rnd);
    const steps = [];
    for (let i = 1 + rnd(4); i; i--) steps.push(...PLANS[PLAN[rnd(PLAN.length)]](M, rnd));
    S.start(c.game, steps, F.LOOP);
  },
  hooks: Object.assign({ 0x3B22: () => true }, S.hooks),
  onPort: P => {
    S.onPort(P);
    const menu = P.MAIN_MENU;
    P.MAIN_MENU = function* (r) { try { return yield* menu(r); } catch (e) { if (e !== P.RESTART) throw e; return { restart: 1 }; } };
  } });
process.exitCode = f ? 1 : 0;
