'use strict';
// The scripts alone against the game's: every script in each moment's database (the areas'
// objects' and conditions' and the global ones) run for random events, with objects, variables
// and bits stirred first; then streams of random tokens (their arguments drawn from what the
// database holds: its objects, areas, entrances and messages) written over the longest script.
// The pauses are let through on both sides, and a key is held for the bordered messages.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 2500, outs: ['a', 'x'] }, o)).fails ? 1 : 0; };
const noWait = P => {
  const g = P.EXECUTE_FCL_STREAM;
  P.EXECUTE_FCL_STREAM = function* (r) { const it = g(r); let s; while (!(s = it.next()).done) { if (!s.value) P.M[0x1063] = 0; yield s.value; } return s.value; };
};
const hooks = {};
for (const a of [0x6F3D, 0x7310, 0x7331]) hooks[a] = c => { c.m[0x1063] = 0; };
const w = (M, a) => M[a] | M[a + 1] << 8;
// the database of a moment: its areas (number, objects) and every script
const cache = new WeakMap();
function db(M0, st) {
  if (cache.has(st)) return cache.get(st);
  const M = st.ram;
  const base = w(M, 0x109C), tab = w(M, 0x109E), n = M[0x9D00];
  const areas = [], scripts = [];
  for (let k = 0; k < n; k++) {
    const ap = (w(M, tab + 2 * k) + base) & 0xFFFF;
    const area = { num: M[ap + 2], ids: [] };
    let o = ap + 8;
    for (let j = 0; j < M[ap + 1]; j++) {
      area.ids.push(M[o + 7]);
      const hdr = M[0x13DF + (M[o] & 15)], len = (M[o + 8] - hdr) & 255;
      if (len && len < 0x80) scripts.push({ p: o + hdr, len });
      o += M[o + 8];
    }
    areas.push(area);
    let c = (ap + w(M, ap + 3)) & 0xFFFF;
    for (let j = M[c++]; j; j--) { scripts.push({ p: c + 1, len: M[c] }); c += 1 + M[c]; }
  }
  let c = w(M, 0x1096);
  for (let j = M[c++]; j; j--) { scripts.push({ p: c + 1, len: M[c] }); c += 1 + M[c]; }
  const longest = scripts.reduce((a, b) => (b.len > a.len ? b : a));
  const d = { areas, scripts, longest };
  cache.set(st, d);
  return d;
}
const stir = (M, rnd, d) => {
  M[0x1084] = rnd(4) ? 1 << rnd(4) : rnd(16);
  if (rnd(3) === 0) M[0x1084] = 0x0F;
  for (let i = rnd(8); i; i--) M[0x2438 + rnd(0x10)] = rnd(4) ? rnd(8) : rnd(256);
  for (let i = rnd(4); i; i--) M[0x2439 + rnd(8)] ^= 1 << rnd(8);
  if (rnd(4) === 0) M[0x2455] = rnd(0x19);
  if (rnd(6) === 0) M[0x2455] = 0xF0 + rnd(16);
  if (rnd(4) === 0) M[0x1099] = rnd(3);
  if (rnd(3) === 0) { M[0x1059] = rnd(256); M[0x105A] = rnd(256); }
  if (rnd(6) === 0) M[0x109B] = rnd(3);
  if (rnd(5) === 0) M[0x243C] ^= 0x40;
  // a few objects hidden, shown or destroyed
  for (let i = rnd(6); i; i--) {
    const a = d.areas[rnd(d.areas.length)];
    if (!a.ids.length) continue;
    const base = w(M, 0x109C), tab = w(M, 0x109E);
    const k = d.areas.indexOf(a), ap = (w(M, tab + 2 * k) + base) & 0xFFFF;
    let o = ap + 8;
    for (let j = rnd(a.ids.length); j; j--) o += M[o + 8];
    M[o] ^= [0x40, 0x40, 0x20, 0x10][rnd(4)];
  }
  // a drawn entry or two marked (bit 7 of its second byte, which $106B counts)
  for (let i = rnd(3) ? 0 : 1 + rnd(2); i && M[0x106A]; i--) {
    const e = w(M, 0x10A6) + 4 + 4 * rnd(M[0x106A]), q = w(M, e);
    M[q + 1] |= 0x80;
  }
  M[0x1065] = 0; if (M[0x1081] === 8) M[0x1081] = 0;
};
const run = (M, c, rnd, d, p, len) => {
  M[0x7C] = p & 255; M[0x7D] = p >> 8;
  c.game.keys.clear(); c.game.keys.add(0x3C);
  return { a: len };
};
t({ name: 'EXECUTE_FCL_STREAM', onPort: noWait, hooks, setup: (M, c, rnd, st) => {
  const d = db(M, st);
  stir(M, rnd, d);
  const s = d.scripts[rnd(d.scripts.length)];
  return run(M, c, rnd, d, s.p, s.len);
} });
// random tokens: [opcode, its arguments]
const token = (rnd, d, M) => {
  const area = () => d.areas[rnd(d.areas.length)];
  const id = a => (a.ids.length && rnd(8) ? a.ids[rnd(a.ids.length)] : rnd(256));
  const here = () => d.areas.find(a => a.num === M[0x2429]) || area();
  const ops = [0x01, 0x13, 0x03, 0x04, 0x05, 0x10, 0x1E, 0x1F, 0x06, 0x07, 0x08, 0x11, 0x20, 0x21, 0x09, 0x0A, 0x0B, 0x14,
    0x2E, 0x2F, 0x0C, 0x0D, 0x0E, 0x1D, 0x0F, 0x1C, 0x12, 0x22, 0x22, 0x1A, 0x1B, 0x23, 0x2C, 0x2D, 0x30, 0x2C, 0x2D];
  const op = ops[rnd(ops.length)];
  const ev = rnd(3) ? 0 : rnd(4) << 6;
  let args;
  if (op === 0x01) args = [rnd(256), rnd(256), rnd(4)];
  else if (op === 0x13) args = [rnd(2) ? rnd(8) : 0xF8 + rnd(8)];
  else if ([0x03, 0x04, 0x05, 0x10, 0x1E, 0x1F, 0x30].includes(op)) args = [id(rnd(3) ? here() : area())];
  else if ([0x06, 0x07, 0x08, 0x11, 0x20, 0x21].includes(op)) { const a = rnd(10) ? area() : { num: rnd(256), ids: [] }; args = [a.num, id(a)]; }
  else if ([0x09, 0x0A].includes(op)) args = [rnd(0x10)];
  else if ([0x0B, 0x14, 0x2E, 0x2F].includes(op)) args = [rnd(0x10), rnd(4) ? rnd(8) : rnd(256)];
  else if ([0x0C, 0x0D, 0x1D].includes(op)) args = [1 + rnd(rnd(8) ? 0x20 : 0x40)];
  else if (op === 0x0E) args = [1 + rnd(0x20), rnd(2)];
  else if ([0x0F, 0x1C].includes(op)) args = [1 + rnd(14)];
  else if (op === 0x12) { const a = area(); args = [a.num, id(a)]; }
  else if (op === 0x22) args = [rnd(3) ? 1 + rnd(0x3D) : 0x80 + rnd(9)];
  else if (op === 0x1B) args = [1 + rnd(4)];
  else args = [];
  const len = M[0x13AE + op];
  const b = [op | ev, ...args];
  while (b.length < len) b.push(0);
  return b.slice(0, Math.max(len, 1));
};
t({ name: 'EXECUTE_FCL_STREAM', onPort: noWait, hooks, cases: 4000, setup: (M, c, rnd, st) => {
  const d = db(M, st);
  stir(M, rnd, d);
  const out = [];
  const room = d.longest.len;
  for (;;) {
    const b = token(rnd, d, M);
    if (out.length + b.length > room) break;
    out.push(...b);
    if (rnd(12) === 0) break;
  }
  if (!out.length) out.push(0x23);
  for (let i = 0; i < out.length; i++) M[d.longest.p + i] = out[i];
  return run(M, c, rnd, d, d.longest.p, rnd(10) ? out.length : rnd(256));
} });
t({ name: 'EXPAND_BORDERED_ROW_30', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => {
  M[0x7A] = rnd(256); M[0x7B] = 0x88 + rnd(0x10);
  return { x: rnd(4) ? 3 * rnd(8) : rnd(256) };
} });
process.exitCode = f ? 1 : 0;
