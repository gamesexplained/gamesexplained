'use strict';
// The objects' routines alone against the game's (check.js): thrust, turning, gravity, contact
// and damage, making and freeing objects, and the wormhole, on the moments of flight with
// objects moved and set up at random. A type is made only when its model is loaded already, or
// it has none (the game's code would load it through the KERNAL, which check.js does not serve).
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 600, outs: [] }, o)).fails ? 1 : 0; };
const nine = (M, i) => M[0x0846 + i];
const pos = (M, i) => 0x065D + nine(M, i);
const w16 = (M, a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
const inUse = M => { const s = []; for (let i = 0; i < 0x14; i++) if (M[0x05F9 + i]) s.push(i); return s; };
const pick = (rnd, a) => a[rnd(a.length)];
const loaded = (M, t) => (M[0x093E + t] & 0x80) || M[0x08F9 + 2 * t];
const types = M => { const s = []; for (let t = 0; t < 0x23; t++) if (loaded(M, t)) s.push(t); return s; };
// slot b moved to within a few units of slot a, on every axis
const near = (M, rnd, a, b) => {
  for (let k = 0; k < 9; k += 3) {
    const v = (M[pos(M, a) + k + 1] | M[pos(M, a) + k + 2] << 8) + rnd(9) - 4;
    M[pos(M, b) + k] = rnd(256); w16(M, pos(M, b) + k + 1, v);
  }
};
// the player's armour high, so that a hit does not end the game
const safe = M => { M[0x051D] = 0xFF; M[0x051E] = 0x7F; };
// ships that are not the player, damaged or not
const shuffleShips = (M, rnd) => { for (let s = 1; s < 6; s++) if (M[0x05F9 + s] && rnd(3) === 0) M[0x0409 + s] = rnd(64); };

t({ name: 'within_range', cases: 1500, setup: (M, c, rnd) => {
  const s = inUse(M), a = pick(rnd, s), b = pick(rnd, s);
  if (rnd(2)) near(M, rnd, a, b);
  w16(M, 0x74, pos(M, a)); w16(M, 0x76, pos(M, b)); M[0x60] = rnd(256); M[0x61] = rnd(3) ? rnd(4) : rnd(256);
}, outs: ['c'] });
t({ name: 'apply_thrust', setup: (M, c, rnd) => { M[0x0D02] = rnd(2); M[0x0D01] = [0, 1, 0xFF][rnd(3)]; for (let s = 0; s < 6; s++) M[0x0415 + s] = rnd(256); shuffleShips(M, rnd); } });
t({ name: 'cruise_thrust', setup: (M, c, rnd) => { const x = pick(rnd, inUse(M).filter(s => s < 6)); M[0x94] = x; M[0x0415 + x] = rnd(256); return { x }; } });
t({ name: 'move_objects' });
t({ name: 'turn_objects', setup: (M, c, rnd) => { for (let s = 0; s < 7; s++) for (const a of [0x0508, 0x050F, 0x0516]) if (rnd(2)) M[a + s] = rnd(3) ? rnd(16) - 8 & 255 : rnd(256); } });
t({ name: 'rate_to_radians', setup: (M, c, rnd) => ({ a: rnd(256) }), outs: ['a'] });
t({ name: 'place_particles', setup: (M, c, rnd) => { for (let s = 6; s < 0x14; s++) M[0x0621 + s] = rnd(3) ? 0 : rnd(16); } });
// a planet or a black hole (gravity's types) in one of the slots
t({ name: 'gravity', setup: (M, c, rnd) => {
  M[0x0834] = rnd(2);
  const s = inUse(M), g = pick(rnd, s.filter(k => k >= 6));
  M[0x060D + g] = [0x15, 0x1C, 0x1D][rnd(3)];
  for (const k of s) if (k < 6 && rnd(2)) near(M, rnd, g, k);
} });
t({ name: 'bearing', cases: 1500, setup: (M, c, rnd) => { const s = inUse(M); return { x: pick(rnd, s), y: pick(rnd, s.filter(k => k < 7)) }; }, outs: ['c'] });
t({ name: 'draw_target_arrows', setup: (M, c, rnd) => { const s = inUse(M).filter(k => k); M[0x0445] = rnd(5) ? pick(rnd, s) : 0xFF; } });
t({ name: 'random_offset', setup: (M, c, rnd) => { w16(M, 0x74, 0xC100); w16(M, 0x78, 0xC110); for (let i = 0; i < 9; i++) M[0xC100 + i] = rnd(256); M[0x60] = rnd(256); M[0x61] = rnd(2); } });
t({ name: 'sector_hazard', setup: (M, c, rnd) => { M[0x0782] = rnd(2); } });
t({ name: 'random_velocity', setup: (M, c, rnd) => ({ y: rnd(0x14) }) });
// contact: two objects put together, the player kept alive; the gate's jump needs the system map
// and the wormhole, so the gate is left out
const noGate = M => inUse(M).filter(k => M[0x060D + k] !== 0x14);
t({ name: 'check_collisions', setup: (M, c, rnd) => {
  safe(M); shuffleShips(M, rnd);
  const s = noGate(M);
  for (let k = 0; k < 1 + rnd(3); k++) near(M, rnd, pick(rnd, s), pick(rnd, s));
  for (let k = 0; k < 6; k++) M[0x040F + k] = rnd(3) ? 0 : rnd(3);
  M[0x0D3C] = rnd(4) ? 0 : 1;
  for (const k of s) if (!loaded(M, M[0x060D + k])) M[0x0635 + k] = 0;
} });
t({ name: 'damage', cases: 1500, setup: (M, c, rnd) => {
  safe(M); shuffleShips(M, rnd);
  const s = inUse(M);
  M[0x80] = rnd(3) ? rnd(40) : rnd(256);
  for (let k = 1; k < 6; k++) if (rnd(4) === 0) { M[0x051D + 2 * k] = rnd(256); M[0x051E + 2 * k] = rnd(2); }
  return { a: [0, 1, 0xFF][rnd(3)], x: rnd(6) ? pick(rnd, s) : 0xFF, y: pick(rnd, s) };
} });
// a pair touching: a ship and anything, sometimes made a missile (in a ship's slot, with an owner
// and a target), a hazard or a shard
t({ name: 'collide', cases: 1500, setup: (M, c, rnd) => {
  safe(M); shuffleShips(M, rnd);
  const s = noGate(M), x = pick(rnd, s.filter(k => k < 6)), y = pick(rnd, s.filter(k => k !== x));
  const r = rnd(4), m = rnd(2) ? x : y;
  if (r === 0 && m && m < 6) {
    M[0x060D + m] = 9 + rnd(3); M[0x0403 + m] = 1; M[0x0433 + m] = rnd(3) ? rnd(6) : 0xFF;
    M[0x0445 + m] = rnd(2) ? 0xFF : pick(rnd, s);
  } else if (r === 1 && y) M[0x060D + y] = [0x1A, 0x1B][rnd(2)];
  near(M, rnd, x, y);
  return { x, y };
} });
t({ name: 'kill_reward', setup: (M, c, rnd) => {
  const s = inUse(M).filter(k => k && k < 6);
  if (!s.length) return {};
  const y = pick(rnd, s);
  M[0x8A] = y; M[0x8C] = rnd(6); M[0x0433 + y] = rnd(5); M[0x079C] = rnd(2); M[0x072A] = rnd(7); M[0x072B] = rnd(256);
  return { y };
}, states: st => st.name.includes('fight') });
t({ name: 'bounce', setup: (M, c, rnd) => { const s = inUse(M); w16(M, 0x7A, 0xC100); for (let i = 0; i < 9; i++) M[0xC100 + i] = rnd(256); return { x: pick(rnd, s.filter(k => k < 6)), y: pick(rnd, s) }; } });
t({ name: 'create_object', cases: 1000, setup: (M, c, rnd) => { w16(M, 0x74, pos(M, pick(rnd, inUse(M)))); for (let k = 1; k < 0x14; k++) if (rnd(3) === 0) M[0x05F9 + k] = 0; return { x: pick(rnd, types(M)) }; } });
t({ name: 'free_slot', setup: (M, c, rnd) => ({ y: 1 + rnd(0x13) }) });
t({ name: 'destroy_object', cases: 1000, setup: (M, c, rnd) => {
  const s = inUse(M).filter(k => k);
  return { y: pick(rnd, s), a: [0, 0xFF, 1 + rnd(5)][rnd(3)] };
}, states: st => st.ram[0x08F9 + 0x30] || (st.ram[0x093E + 0x18] & 0x80) });
t({ name: 'age_objects', setup: (M, c, rnd) => { for (let k = 6; k < 0x14; k++) if (M[0x05F9 + k] && rnd(2)) { M[0x051D + 2 * k] = rnd(3); M[0x051E + 2 * k] = rnd(2) ? 0 : 0xFF; } } });
t({ name: 'facing_face', cases: 1500, setup: (M, c, rnd) => { for (let i = 0; i < 0x40; i++) M[0xFA36 + i] = rnd(256); }, outs: ['y'] });
// the wormhole: rings made ahead of the player at the origin
t({ name: 'make_wormhole', states: st => [0x1F, 0x20, 0x21].every(k => st.ram[0x08F9 + 2 * k] || (st.ram[0x093E + k] & 0x80)), setup: (M, c, rnd) => {
  for (let k = 7; k < 0x14; k++) M[0x05F9 + k] = 0; M[0x749B] = rnd(256);
} });
t({ name: 'ring_drift', cases: 1500, setup: (M, c, rnd) => { M[0x74A0] = rnd(256); M[0x74A1] = rnd(8); for (let i = 0; i < 9; i++) M[0x6B + i] = rnd(256); return { y: rnd(2) ? 1 : 4 }; } });
t({ name: 'ring_type', setup: (M, c, rnd) => { M[0x749B] = rnd(256); }, outs: ['x'] });
process.exitCode = f ? 1 : 0;
