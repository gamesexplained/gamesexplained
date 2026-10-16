'use strict';
// HIVE!'s routines alone against the game's (check.js), on the moments docked at a base with
// the cabinet's files in memory as its start leaves them: HCODE at $5700, the island (H.MAP) at
// $5100 and its tiles (H.TIL) at $4000. Manchi and mounds are put about the trooper, and the
// waits are scripted as for a base's routines (script.js).
const { check } = require('./check.js');
const { portDisk } = require('./lockstep.js');
const { script, scripted: stubbed, choices, cover, covered, CALLER } = require('./script.js');
let f = 0;
// node t-hive.js [names]: those checks only
const ONLY = process.argv.slice(2);
const t = o => {
  if (ONLY.length && !ONLY.includes(o.name)) return;
  f += check(Object.assign({ cases: 200, outs: [], moments: 'station', parts: ['engine', 'station', 'hive'], maxSteps: 4e7 }, o)).fails ? 1 : 0;
};
const pick = (rnd, a) => a[rnd(a.length)];
const dir = rnd => pick(rnd, [0xFF, 0, 1]);
const disk = portDisk();
const FILES = [['HCODE', 0x5700], ['H.MAP', 0x5100], ['H.TIL', 0x4000]];
// The island as a game finds it, with up to six Manchi and three mounds within d of the trooper
// (who may have walked), the level, the mounds to destroy, the timer and the aim
function island(M, rnd, d = 3) {
  for (const [name, a] of FILES) M.set(disk.load(name).subarray(2), a);
  M[0x0D30] = 9; M[0x0D31] = 0xB7; M[0x0D32] = 0;
  const at = () => [(M[0x5510] + rnd(2 * d + 1) - d) & 255, (M[0x5530] + rnd(2 * d + 1) - d) & 255];
  if (rnd(2)) [M[0x5510], M[0x5530]] = [8 + rnd(16), 8 + rnd(16)];
  let e = 2;
  for (let i = rnd(4); i; i--, e++) { const [x, y] = at(); M[0x5510 + e] = x; M[0x5530 + e] = y; M[0x5570 + e] = 0x62; M[0x5550 + e] = 0x80; M[0x5590 + e] = 0xFF; }
  const mounds = e;
  for (let i = rnd(7); i; i--, e++) {
    const [x, y] = at();
    M[0x5510 + e] = x; M[0x5530 + e] = y; M[0x5590 + e] = 1; M[0x5570 + e] = pick(rnd, [0, 8]);
    M[0x5550 + e] = 0x80 | pick(rnd, [1, 1, 3]); M[0x5618 + e] = mounds > 2 ? 2 + rnd(mounds - 2) : 0;
  }
  M[0xCE] = 1 + rnd(6); M[0xCC] = rnd(4); M[0xCD] = 1 + rnd(30); M[0x5E] = rnd(256);
  M[0xCA] = dir(rnd); M[0xCB] = dir(rnd);
  return e;
}
// a Manchi on the island, or 2 when there is none
const manchi = (M, rnd) => { const m = []; for (let y = 2; y < 32; y++) if (M[0x5590 + y] === 1) m.push(y); return m.length ? pick(rnd, m) : 2; };
const scripted = P => { cover(P, 'g-hive.js'); stubbed(P); };
// a check of a routine that waits, its menus and keys scripted
const w = o => t(Object.assign({ cases: 60, onPort: scripted }, o, { setup: (M, c, rnd, st) => {
  script(M, choices(rnd, o.fill, o.most), o.keys ? o.keys(rnd) : []);
  island(M, rnd);
  const v = pick(rnd, [0, 1, 40]); M[0x0728] = v; M[0x0729] = 0;
  return o.setup ? o.setup(M, c, rnd, st) : undefined;
} }));
// a routine that drops its caller's return, called from a JSR at $0360
const caller = (M, a) => { M[CALLER] = 0x20; M[CALLER + 1] = a & 255; M[CALLER + 2] = a >> 8; M[CALLER + 3] = 0x60; };

t({ name: 'hive_sees', outs: ['c'], setup: (M, c, rnd) => { island(M, rnd, 6); return { y: manchi(M, rnd) }; } });
t({ name: 'hive_mood', setup: (M, c, rnd) => { island(M, rnd, 6); } });
t({ name: 'hive_draw', setup: (M, c, rnd) => { island(M, rnd); } });
t({ name: 'hive_caught', entry: CALLER, setup: (M, c, rnd) => { caller(M, 0x5947); island(M, rnd, 2); } });
t({ name: 'hive_recall', entry: CALLER, setup: (M, c, rnd) => {
  caller(M, 0x5BCD); island(M, rnd);
  if (rnd(2)) { M[0x5510] = 0x12; M[0x5530] = 0x0E; }
  if (rnd(2)) M[0xCC] = 0;
} });
t({ name: 'hive_breed', setup: (M, c, rnd) => { island(M, rnd); } });
t({ name: 'hive_breed_one', setup: (M, c, rnd) => { const e = island(M, rnd); M[0xC6] = 2 + rnd(Math.max(1, e - 2)); } });
t({ name: 'hive_wander', setup: (M, c, rnd) => { island(M, rnd); M[0xBC] = manchi(M, rnd); M[0xBD] = dir(rnd); M[0xBE] = dir(rnd); } });
// the trooper's step from the stick, or a key in the buffer
const step = (M, c, rnd) => {
  const r = rnd(3);
  if (r === 0) c.game.joy = 0x1F & ~pick(rnd, [1, 2, 4, 8, 5, 6, 9, 10]);
  else if (r === 1) { M[0x03] = 1; M[0x05] = pick(rnd, Array.from({ length: 20 }, (_, i) => M[0xA375 + i]).concat([0x20, 0x1B])); }
};
t({ name: 'hive_moves', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { island(M, rnd); step(M, c, rnd); return { a: M[0xCE] }; } });

w({ name: 'hive_show_mounds' });
w({ name: 'hive_clear_view' });
w({ name: 'hive_mound_frame', setup: (M, c, rnd) => { M[0x95] = rnd(99); M[0xC7] = 0x5F + rnd(3); } });
w({ name: 'hive_raise_mound', cases: 150, setup: (M, c, rnd) => { M[0xCD] = pick(rnd, [1, 2, 3, 10]); } });
w({ name: 'hive_shoot', cases: 200, setup: (M, c, rnd) => ({ a: pick(rnd, [0x20, 0x20, 0x1B, 0, 0x41]), x: dir(rnd), y: dir(rnd) }) });
w({ name: 'hive_quit', cases: 20 });
// a drop, a game and the cabinet from its start: the trooper stood still or walked by the stick,
// until the Manchi catch him
w({ name: 'hive_drop', cases: 20, loops: true, maxSteps: 2e9, setup: (M, c, rnd) => {
  if (rnd(2)) c.game.joy = 0x1F & ~pick(rnd, [1, 2, 4, 8]);
  return { a: 1 + rnd(3), x: 1 + rnd(3) };
} });
w({ name: 'hive_start', cases: 12, loops: true, maxSteps: 3e8, most: 2 });

covered();
process.exitCode = f ? 1 : 0;
