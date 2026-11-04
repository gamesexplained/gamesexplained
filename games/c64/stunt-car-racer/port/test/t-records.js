'use strict';
// The records, the Hall of Fame and the players' keys ($91B4-$9318, $9846-$9A31) against the
// game's, on moments of play with the league, the clocks and the records under the chips stirred,
// and the controls played from a script (input.js) for the routines that wait.
const { check } = require('./check.js');
const { script, JOY, KEY, typed } = require('./input.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 300, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const S = script();
const io = { hooks: S.hooks, onPort: S.onPort };
const bcd = rnd => (rnd(10) << 4) | rnd(10);
const time = (M, rnd, x) => {
  M[0x8298 + x] = bcd(rnd); M[0x82B0 + x] = rnd(4) ? (rnd(6) << 4) | rnd(10) : 0;
  M[0x8398 + x] = rnd(4) ? rnd(9) : [0, 9, 10][rnd(3)];
};
// the league as a race leaves it: players, division, the drivers, the tables and the clocks; the
// records' holders and times under the chips
const league = (M, c, rnd) => {
  M[0x31A1] = rnd(3) ? 0 : 1 + rnd(7);
  M[0xC71A] = rnd(3) ? 0 : 1; M[0xC77D] = rnd(8); M[0xC718] = rnd(4); M[0xC360] = rnd(4); M[0xC77F] = rnd(2);
  M[0x31A4] = rnd(2) ? 0x0B : 4 + rnd(8); M[0xC378] = [1, 2, 3, 4, 4][rnd(5)];
  M[0xC305] = [0, 0x41, 0x81, 0xC1, 0x40, 0x80, 0xC0][rnd(7)]; M[0xC39C] = rnd(2) ? 0x80 : 0;
  M[0xC76D] = rnd(3) ? rnd(12) : 0; M[0xC76E] = rnd(3) ? rnd(12) : 0;
  for (let i = 0; i < 12; i++) { M[0xC728 + i] = rnd(7); M[0xC734 + i] = rnd(7); M[0xC740 + i] = rnd(13); M[0xC74C + i] = rnd(30); }
  for (let x = 0; x < 0x18; x++) if (rnd(2)) time(M, rnd, x);
  for (let i = 0; i < 32; i++) {
    const b = 0xDE00 + (i << 4);
    if (rnd(2)) { for (let y = 0; y < 12; y++) M[b + y] = 0x41 + rnd(26); }
    M[b + 0x0C] = rnd(10); M[b + 0x0D] = (rnd(6) << 4) | rnd(10); M[b + 0x0E] = bcd(rnd);
  }
  M[0x19] = rnd(10); M[0x7A] = 9 + rnd(12); M[0x74] = 9 + rnd(12);
  M[0xC7] = rnd(12); M[0x50] = rnd(12); M[0x8A] = (M[0x50] + 1 + rnd(4)) & 255;
};
const FIRE = [{ len: 40, keys: [], joy: JOY.none }, { len: 40, keys: [KEY.RETURN], joy: JOY.fire }];
const waits = (M, c, rnd) => { league(M, c, rnd); S.start(c.game, [{ len: rnd(60), keys: [], joy: rnd(2) ? JOY.fire : JOY.none }], FIRE); };
T('PRINT_TIME', { cases: 1000, setup: (M, c, rnd) => { const x = rnd(0x18); time(M, rnd, x); return { x, y: rnd(25) }; }, outs: ['a', 'x', 'y'] });
T('RECORD_NAME', { setup: (M, c, rnd) => { league(M, c, rnd); return { y: [0xC9, 0xD6][rnd(2)] }; }, outs: ['a', 'x', 'y'] });
T('CHECK_RECORDS', { cases: 1000, setup: (M, c, rnd) => { league(M, c, rnd); return { x: rnd(2) }; }, outs: ['x'] });
T('TRACK_RECORDS', { cases: 500, setup: (M, c, rnd) => { league(M, c, rnd); return { a: rnd(2) ? 0x80 : rnd(0x80) }; }, outs: ['a', 'x', 'y'] });
T('PLAYER_KEYS', { cases: 500, setup: (M, c, rnd) => { league(M, c, rnd); return { a: rnd(2) ? 0x80 : 0 }; }, outs: ['a', 'x', 'y'] });
T('SHOW_RECORDS', { setup: (M, c, rnd) => { league(M, c, rnd); for (let i = 0; i < 25; i++) M[0x31AA + 0xC9 + i] = 0x41 + rnd(26); } });
T('BONUS_LINES', { setup: league });
T('BONUS_RESULTS', Object.assign({ cases: 100, setup: waits }, io));
T('ROUND_RESULTS', Object.assign({ cases: 100, setup: waits }, io));
T('HALL_OF_FAME', Object.assign({ cases: 100, maxSteps: 2e7, setup: waits }, io));
// the keys defined again from the pause: F1 held or not at the start; keys pressed at random, then
// the five of a set over and over, so that the confirming pass finds them the same
const someKeys = rnd => { const k = []; while (k.length < 5) { const x = rnd(64); if (x !== KEY.F1 || rnd(3)) k.push(x); } return k; };
T('REDEFINE_KEYS', Object.assign({ cases: 150, maxSteps: 1e8, setup: (M, c, rnd) => {
  const steps = [{ len: 1 + rnd(4), keys: rnd(4) ? [KEY.F1] : [] }];
  for (let i = rnd(8); i; i--) steps.push(...typed(rnd, [rnd(64)]));
  const five = someKeys(rnd), loop = [];
  for (const k of five) loop.push(...typed(rnd, [k]));
  S.start(c.game, steps, loop);
} }, io));
process.exitCode = f ? 1 : 0;
