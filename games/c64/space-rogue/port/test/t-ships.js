'use strict';
// The ships' routines alone against the game's (check.js): the frame's upkeep, the keys and the
// joystick, targets, missiles and the beam, the computer ships' minds, and what they use of the
// encounter tables and the hold, on the moments of flight with the ships set up at random. The
// routines that wait for a key (surrender, the menus) are the lockstep's to check.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 600, outs: [] }, o)).fails ? 1 : 0; };
const w16 = (M, a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
const pick = (rnd, a) => a[rnd(a.length)];
const ships = M => { const s = []; for (let i = 1; i < 6; i++) if (M[0x05F9 + i]) s.push(i); return s; };
const inUse = M => { const s = []; for (let i = 0; i < 0x14; i++) if (M[0x05F9 + i]) s.push(i); return s; };
const fights = st => /fight/.test(st.name);
// the player's armour high, so that a hit does not end the game; no surrender offered (it waits)
const safe = M => { M[0x051D] = 0xFF; M[0x051E] = 0x7F; M[0x0832] = 1; };
// the computer ships' targets, states and tactics shuffled
const minds = (M, rnd) => {
  const s = inUse(M).concat([0xFF]);
  for (const i of ships(M)) {
    if (rnd(2)) M[0x0445 + i] = pick(rnd, s);
    if (rnd(3) === 0) M[0x0439 + i] = pick(rnd, s);
    if (rnd(3) === 0) M[0x041B + i] = pick(rnd, [0, 1, 2, 3, 0xFE, 0xFF]);
    if (rnd(3) === 0) M[0x043F + i] = rnd(10);
    if (rnd(3) === 0) M[0x0433 + i] = pick(rnd, [0, 1, 2, 3, 0xFF]);
    if (rnd(4) === 0) M[0x0409 + i] = rnd(64);
    if (rnd(4) === 0) for (const a of [0x0508, 0x050F, 0x0516]) M[a + i] = 0;
    if (rnd(4) === 0) { M[0x051D + 2 * i] = rnd(256); M[0x051E + 2 * i] = rnd(3); }
  }
  for (let k = 0; k < 4; k++) if (rnd(3) === 0) M[0x072E + k] = pick(rnd, [0, 1, 2, 0xFE, 0xFF]);
  if (rnd(3) === 0) { M[0x0726] = rnd(256); M[0x0727] = rnd(2); }
};
const aiSlot = (M, rnd) => {
  const s = ships(M);
  const x = s.length ? pick(rnd, s) : 1 + rnd(5);
  M[0xD5] = x;
  M[0xD0] = rnd(256); M[0xD1] = pick(rnd, [7, 8, 9, 0xF8, rnd(256)]);
  M[0xD2] = rnd(256); M[0xD3] = pick(rnd, [0xFF, 0xFE, 0, rnd(256)]); M[0xD4] = rnd(2) ? 0xFF : 0;
  return x;
};
const hold = (M, rnd) => { const n = M[0x0777] || 1; for (let i = 0; i < n; i++) M[0x0767 + i] = rnd(3) ? 0xFF : rnd(8); };

// ---- the frame's upkeep: every pass, the 256th and the 16th, with a target, auto fire and a
// danger high enough for a new ship
t({ name: 'frame_update', cases: 800, setup: (M, c, rnd) => {
  safe(M); minds(M, rnd);
  M[0x5E] = pick(rnd, [0xFF, 0x0F, 0x1F, rnd(256)]);
  M[0x0836] = rnd(3) ? 0 : rnd(4);
  M[0x0CFF] = rnd(2) ? 0xFF : 0; M[0x0D00] = rnd(3) ? 0 : rnd(9);
  if (rnd(2)) M[0x0445] = pick(rnd, inUse(M).concat([0xFF]));
  M[0x135D] = rnd(3) ? 1 + rnd(7) : 1;
  M[0x0D29] = pick(rnd, [0, 0xFF, rnd(12)]);
  M[0x077C] = rnd(256);
  M[0x0833] = rnd(2);
  hold(M, rnd);
} });

// ---- keys and the joystick (not G, N, Escape or Control-S, which wait)
const KEYS = [0x34, 0x41, 0x08, 0x36, 0x44, 0x15, 0x38, 0x57, 0x0B, 0x32, 0x58, 0x0A, 0x35, 0x53, 0x31, 0x5A, 0x33, 0x43,
  0x4A, 0x2D, 0x2B, 0x05, 0x1F, 0x56, 0x54, 0x14, 0x49, 0x4C, 0x30, 0x20, 0x52, 0x2E, 0x0D, 0x61, 0x7A];
t({ name: 'do_key', cases: 1500, setup: (M, c, rnd) => {
  safe(M);
  M[0x0838] = rnd(4) ? 0 : 1;
  M[0x0D02] = rnd(2); M[0x0D01] = pick(rnd, [0, 1, 0xFF]);
  M[0x0415] = pick(rnd, [0, 0x46, 0x45, 0xBA, 0xBB, rnd(256)]);
  for (const a of [0x0508, 0x050F, 0x0516]) M[a] = pick(rnd, [0, 0x46, 0xBA, rnd(256)]);
  M[0x073E] = rnd(2); M[0x0CFE] = rnd(4); for (let k = 1; k < 4; k++) M[0x0731 + k] = rnd(3);
  M[0x0836] = rnd(2) ? 0 : 5;
  if (rnd(2)) M[0x0445] = pick(rnd, inUse(M).concat([0xFF]));
  hold(M, rnd);
  // the key in the buffer, or none; the joystick at random, its fire seldom
  M[0x03] = rnd(5) ? 1 : 0; M[0x05] = pick(rnd, KEYS);
  c.game.joy = 0x1F & ~(rnd(3) ? pick(rnd, [0, 1, 2, 4, 8, 5, 10]) : 0x10);
  c.game.joy1 = 0x1F & ~pick(rnd, [0, 0, 1, 2]);
} });
// entered with N as the DEX or INX before it left it
t({ name: 'clamp_rate', setup: (M, c, rnd) => { const x = rnd(256); return { x, n: x >> 7 }; }, outs: ['x'] });
t({ name: 'joystick_flight', cases: 800, setup: (M, c, rnd) => {
  safe(M);
  M[0x0D02] = rnd(2); M[0x0D01] = pick(rnd, [0, 1, 0xFF]);
  M[0x0415] = pick(rnd, [0, 0x46, 0x45, 0xBA, 0xBB, rnd(256)]);
  M[0x0D03] = rnd(2) ? rnd(32) : 0;
  c.game.joy = 0x1F & ~(rnd(4) ? rnd(16) : 0x10);
  c.game.joy1 = 0x1F & ~rnd(4);
} });

// ---- targets and weapons
t({ name: 'key_next_target', setup: (M, c, rnd) => { M[0x0445] = pick(rnd, inUse(M).concat([0xFF, 0x13])); } });
t({ name: 'key_next_weapon', setup: (M, c, rnd) => { M[0x0CFE] = rnd(4); for (let k = 1; k < 4; k++) M[0x0731 + k] = rnd(2) ? 0 : rnd(4); } });
t({ name: 'target_status', cases: 800, setup: (M, c, rnd) => {
  minds(M, rnd);
  M[0x0445] = pick(rnd, ships(M).concat(inUse(M), [0xFF]));
  M[0x0833] = rnd(2);
  for (const i of ships(M)) if (rnd(3) === 0) M[0x060D + i] = pick(rnd, [M[0x060D + i], 0x0C]);
} });
t({ name: 'launch_missile', cases: 1500, states: fights, setup: (M, c, rnd) => {
  safe(M); minds(M, rnd);
  const y = rnd(3) ? pick(rnd, [0].concat(ships(M))) : 0;
  M[0x0836] = rnd(3) ? 0 : 9;
  for (let k = 1; k < 4; k++) M[0x0731 + k] = rnd(3);
  for (const i of ships(M)) if (rnd(4) === 0) M[0x0403 + i] = 1;
  return { x: 9 + rnd(3), y };
} });
t({ name: 'fire_beam', cases: 1500, states: fights, setup: (M, c, rnd) => {
  safe(M); minds(M, rnd);
  M[0x0D3C] = rnd(3) ? 0 : 1 + rnd(2); M[0x0D00] = rnd(9);
  if (rnd(2)) M[0x0445] = pick(rnd, inUse(M).concat([0xFF]));
  return { y: rnd(2) ? 0 : pick(rnd, [0].concat(ships(M))) };
} });
t({ name: 'trace_beam', cases: 800, states: fights, setup: (M, c, rnd) => {
  const y = pick(rnd, [0].concat(ships(M)));
  M[0xA8] = y;
  w16(M, 0x74, 0x045D + M[0x083C + y]);
  return { y };
}, outs: ['a'] });
t({ name: 'draw_beam', cases: 1500, states: fights, setup: (M, c, rnd) => {
  M[0x0D3C] = rnd(3) ? 0 : 1 + rnd(2);
  return { a: rnd(5), x: pick(rnd, inUse(M).concat([0xFF])), y: pick(rnd, [0].concat(ships(M))) };
} });
t({ name: 'beam_hit', cases: 1000, states: fights, setup: (M, c, rnd) => {
  safe(M); M[0x0D00] = rnd(9);
  return { a: rnd(5), x: pick(rnd, inUse(M)), y: pick(rnd, [0].concat(ships(M))) };
} });

// ---- the minds
t({ name: 'ship_ai', cases: 1500, states: fights, setup: (M, c, rnd) => {
  safe(M); minds(M, rnd);
  M[0x3808] = rnd(3) ? 0 : rnd(17); M[0x3809] = rnd(3);
} });
t({ name: 'ai_find_target', cases: 800, states: fights, setup: (M, c, rnd) => { minds(M, rnd); return { x: aiSlot(M, rnd) }; } });
t({ name: 'ai_find_enemy', cases: 800, states: fights, setup: (M, c, rnd) => { minds(M, rnd); return { x: aiSlot(M, rnd) }; }, outs: ['y', 'n'] });
t({ name: 'faction_attitude', cases: 1500, setup: (M, c, rnd) => {
  minds(M, rnd);
  if (rnd(3) === 0) M[0x060D + 1] = 0x0C;
  return { a: pick(rnd, [0, 1, 2, 3, 0xFF, rnd(256)]), x: pick(rnd, [0, 1, 2, 3, 4, 4, 0xFF, rnd(256)]), y: pick(rnd, [0, 1, 2, 3, 4, 5]) };
}, outs: ['a', 'x', 'n', 'z'] });
t({ name: 'ai_attitude', cases: 800, states: fights, setup: (M, c, rnd) => { minds(M, rnd); aiSlot(M, rnd); } });
t({ name: 'ai_tactic', cases: 800, states: fights, setup: (M, c, rnd) => { minds(M, rnd); aiSlot(M, rnd); } });
t({ name: 'ai_speed', cases: 800, states: fights, setup: (M, c, rnd) => { minds(M, rnd); const x = aiSlot(M, rnd); if (rnd(2)) M[0x0445 + x] = pick(rnd, inUse(M)); return { x }; } });
t({ name: 'ai_closing_speed', setup: (M, c, rnd) => { aiSlot(M, rnd); M[0xC7] = rnd(256); } });
t({ name: 'ai_fire', cases: 1500, states: fights, setup: (M, c, rnd) => {
  safe(M); minds(M, rnd);
  const x = aiSlot(M, rnd);
  M[0x0445 + x] = pick(rnd, [0].concat(inUse(M)));
  M[0x041B + x] = pick(rnd, [0xFE, 0xFF, 1]);
  if (rnd(2)) M[0xD1] = 7;
  if (rnd(2)) { M[0xD3] = 0xFF; M[0xD2] = 0xF0; M[0xD4] = 0; }
} });
t({ name: 'ai_fight_score', cases: 1500, states: fights, setup: (M, c, rnd) => {
  minds(M, rnd);
  return { a: rnd(8), x: pick(rnd, ships(M).concat([1])), y: pick(rnd, [0].concat(inUse(M), [0xFF])) };
}, outs: ['a', 'n'] });
t({ name: 'change_standing', setup: (M, c, rnd) => {
  for (let k = 0; k < 4; k++) M[0x072E + k] = pick(rnd, [0, 1, 2, 0xFE, 0xFF]);
  return { a: pick(rnd, [1, 0xFF, 2, rnd(256)]), y: pick(rnd, [0, 1, 2, 3, 0xFF]) };
} });
t({ name: 'ai_steer', cases: 1500, states: fights, setup: (M, c, rnd) => {
  minds(M, rnd);
  const x = aiSlot(M, rnd);
  if (rnd(2)) for (const a of [0x0508, 0x050F, 0x0516]) M[a + x] = 0;
  if (rnd(2)) M[0x0445 + x] = pick(rnd, inUse(M));
} });
t({ name: 'random_rates', setup: (M, c, rnd) => ({ x: rnd(6) }) });
t({ name: 'steer_toward', cases: 1500, states: fights, setup: (M, c, rnd) => {
  const x = pick(rnd, ships(M).concat([0]));
  w16(M, 0x74, 0x0896);
  for (let i = 0; i < 9; i += 3) { M[0x0896 + i] = rnd(256); M[0x0897 + i] = (rnd(16) - 8) & 255; M[0x0898 + i] = rnd(2) ? 0xFF : 0; }
  return { a: rnd(3) ? 0 : rnd(256), x };
} });
t({ name: 'random_label', outs: ['a'] });

// ---- the encounter tables and the hold
t({ name: 'pick_ship_with_chance', cases: 1000, setup: (M, c, rnd) => { M[0x0C79] = rnd(16); return { a: rnd(256) }; }, outs: ['a', 'x', 'y', 'n'] });
t({ name: 'cargo_add', setup: (M, c, rnd) => { M[0x0777] = 1 + rnd(8); hold(M, rnd); return { a: rnd(8), x: rnd(256) }; }, outs: ['c'] });
t({ name: 'cargo_jettison', setup: (M, c, rnd) => { M[0x0777] = 1 + rnd(8); hold(M, rnd); } });
t({ name: 'cargo_count', setup: (M, c, rnd) => { M[0x0777] = 1 + rnd(8); hold(M, rnd); }, outs: ['a', 'x', 'n', 'z'] });
t({ name: 'pay_credits', setup: (M, c, rnd) => { w16(M, 0x0728, rnd(65536)); M[0x60] = rnd(256); M[0x61] = rnd(256); }, outs: ['c'] });
t({ name: 'add_credits', setup: (M, c, rnd) => { w16(M, 0x0728, rnd(65536)); M[0x60] = rnd(256); M[0x61] = rnd(256); } });
// the merchant's offer, as far as its tests go (the offer itself waits)
t({ name: 'merchant_surrender', cases: 1500, states: fights, setup: (M, c, rnd) => {
  minds(M, rnd);
  M[0x0832] = rnd(4) ? 0 : 1;
  const s = ships(M);
  if (s.length) {
    const y = pick(rnd, s);
    M[0x0445] = y; M[0x0445 + y] = 0; M[0x0433 + y] = 1;
    M[0x051D + 2 * y] = rnd(256); M[0x051E + 2 * y] = 0;
  }
  // a ship still fighting the player keeps it from offering, so that none of these waits
  const other = s.filter(i => i !== M[0x0445]);
  if (other.length) { const o = pick(rnd, other); M[0x0445 + o] = 0; M[0x0403 + o] = 0; } else M[0x0832] = 1;
} });
process.exitCode = f ? 1 : 0;
