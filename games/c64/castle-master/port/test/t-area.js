'use strict';
// The controls and the areas alone against the game's: the joystick and keys held in every
// mix (more than five codes among them); the global lists; each area chosen (and a number no
// area has); the player put at each of an area's objects as an entrance, flying or not; and a
// new session from every moment.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: ['a', 'x', 'y'] }, o)).fails ? 1 : 0; };
const w = (M, a) => M[a] | M[a + 1] << 8;
const areas = M => {
  const base = w(M, 0x109C), tab = w(M, 0x109E), out = [];
  for (let k = 0; k < M[0x9D00]; k++) {
    const ap = (w(M, tab + 2 * k) + base) & 0xFFFF, ids = [];
    let o = ap + 8;
    for (let j = 0; j < M[ap + 1]; j++) { ids.push(M[o + 7]); o += M[o + 8]; }
    out.push({ num: M[ap + 2], ids });
  }
  return out;
};
const choose = (M, rnd) => {
  const as = areas(M), a = as[rnd(as.length)];
  M[0x2429] = rnd(12) ? a.num : rnd(256);
  M[0x1047] = as[rnd(as.length)].num;
  M[0x1066] = a.ids.length && rnd(10) ? a.ids[rnd(a.ids.length)] : rnd(256);
  if (rnd(3) === 0) M[0x2418] = rnd(2);
  if (rnd(3) === 0) M[0x2412] = 1 + rnd(3);
};
t({ name: 'READ_CONTROL_INPUT', cases: 4000, outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => {
  c.game.keys.clear();
  for (let i = rnd(3) ? rnd(3) : rnd(9); i; i--) c.game.keys.add(rnd(64));
  c.game.joy = rnd(3) ? 0x1F : rnd(32);
} });
t({ name: 'INSTALL_GLOBAL_DATABASE_POINTERS' });
t({ name: 'RESET_GLOBAL_OBJECT_FLAGS_AND_APPLY_ID_FF_ALLOWLIST', setup: (M, c, rnd) => { if (rnd(5) === 0) M[0x1060] = 0; } });
t({ name: 'SELECT_AREA', cases: 2500, setup: (M, c, rnd) => { choose(M, rnd); } });
t({ name: 'ENTER_DESTINATION_AREA', cases: 2500, setup: (M, c, rnd) => { choose(M, rnd); } });
t({ name: 'INITIALIZE_NEW_SESSION', setup: (M, c, rnd) => { if (rnd(2)) M[0x246E] = rnd(2); } });
process.exitCode = f ? 1 : 0;
