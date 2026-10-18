'use strict';
// The zones alone against the game's, as play calls them; then the leader put in each zone with
// every stage of what it starts (the welcome's talk, the meal of creature $2D, the capture, the
// ceremony's count, the dynamite placed or not) and the fuse burning to the blast, carried, in the
// bag or lying.
const { check, prefetch, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
const NAMES = ['zones_pass', 'dynamite', 'river', 'tribe_welcome', 'tribe_says', 'zone_2d_outer', 'zone_2d_inner',
  'zone_2d_fed', 'zone_2d_grab', 'capture', 'altar', 'sacrifice', 'ceremony_over', 'dynamite_zone', 'set_route'];
const ENTRIES = [0xFCC1, 0xFCC5, 0x96C5];
prefetch(NAMES.concat(ENTRIES), MIX);
for (const name of NAMES) t({ name, outs: name === 'sacrifice' ? ['hl'] : [] });
for (const entry of ENTRIES) t({ entry });

const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
const put = (c, a, v) => { c.M[a] = v; if (a >= 0xC000) c.banks[3][a - 0xC000] = v; };
const inPlay = c => { const l = []; for (let a = 0x8300; a < 0x8400; a += 0x20) if (c.M[a + 1] !== 0xFF) l.push(a); return l; };
const pick = (rnd, l) => l[rnd(l.length)];
// every stage of what the zones start
const stages = (c, rnd) => {
  put(c, 0xFB5E, rnd(2) ? 0xFF : pick(rnd, [9, 0x0A, 0x0B, 0x10, rnd(0x11)]));
  put(c, 0xFB5F, pick(rnd, [1, 0xC1, 0xA1, 0x81, 0x41, 0x21, 0x11, rnd(256)]));
  c.M[0x8D0D] = pick(rnd, [0, 0x80, 0x7F, 0xFF, rnd(256)]);
  c.M[0x8D0E] = pick(rnd, [0, 0x7F, 0x7C, 0x7B, 0xFF, 0x80, 0xF0, 0xF1, 0x40, rnd(256)]);
  c.M[0x8D0F] = rnd(3) ? 0 : 0xFF;
  c.M[0x8D15] = pick(rnd, [0xFF, 0x3F, 0x7F, 0xBF, 0xE7, 0, rnd(256)]);
  c.M[0x8D0C] = rnd(4) | (rnd(4) ? 0 : 0x80);
  c.M[0x8D0B] = pick(rnd, [0, 0x80, 0x10, 0x90, 0x11, 0x0F, 0x8F, 0x05, 0x85, 0x01, 0x81]);
  put(c, 0xED65, rnd(2) ? 0x20 : 0);
  put(c, 0xED1F, rnd(2) ? 2 : rnd(16));
  const l = inPlay(c);
  if (l.length > 1 && rnd(2)) { const a = pick(rnd, l.slice(1)); c.M[a] = pick(rnd, [5, 6, 7, 0x2B, 0x2C, 0x2D, rnd(4)]); }
  if (rnd(3) === 0) { const a = pick(rnd, l); c.M[a + 1] = (c.M[a + 1] & 0xF0) | rnd(16); c.M[a + 4] = rnd(256); }
};
// the leader in zone z (its area, and a place within its ranges)
const inZone = (c, rnd, z) => {
  const p = 0xFB1E + 5 * z, B = k => c.M[p + k];
  if (B(2) <= B(1) || B(4) <= B(3)) return false;
  c.M[0x8D1F] = B(0);
  c.M[0xDB05] = B(1) + rnd(B(2) - B(1));
  c.M[0xDB06] = B(3) + rnd(B(4) - B(3));
  return true;
};
const passes = at('zones_pass');
t({ name: 'zones_pass', cases0: passes, cases: 900, setup: (c, rnd) => {
  stages(c, rnd);
  if (rnd(8) && !inZone(c, rnd, rnd(9))) return false;
} });
for (const [name, z] of [['tribe_welcome', 0], ['zone_2d_inner', 1], ['zone_2d_outer', 2], ['capture', 3], ['altar', 4],
  ['dynamite_zone', 5], ['river', 6]]) {
  t({ name, cases0: passes, cases: 300, setup: (c, rnd) => { stages(c, rnd); if (!inZone(c, rnd, z)) return false; } });
}
// the blast: the dynamite carried by any of the party, in the bag carried or lying, or lying, near
// the actors in play
t({ name: 'dynamite', cases0: passes, cases: 400, setup: (c, rnd) => {
  stages(c, rnd);
  c.M[0x8D0B] = pick(rnd, [0x10, 0x90, 0x10, 0x0F, 0x01]);
  const ch = rnd(4);
  put(c, 0xED49, pick(rnd, [0x20 | ch, 0x24, c.M[0x8D1F]]));
  put(c, 0xECD9, rnd(2) ? 0x20 | ch : c.M[0x8D1F]);
  const l = inPlay(c), a = pick(rnd, l);
  const x = (c.M[a + 0x0E] | c.M[a + 0x0F] << 8) >> 2, y = (c.M[a + 0x10] | c.M[a + 0x11] << 8) >> 2;
  for (const p of [0xED4A, 0xECDA]) { put(c, p, (x + rnd(20) - 10) & 255); put(c, p + 1, (y + rnd(20) - 10) & 255); }
} });
t({ name: 'sacrifice', cases0: passes, cases: 200, outs: ['hl'], setup: stages });
t({ name: 'ceremony_over', cases0: passes, cases: 100, setup: stages });
t({ name: 'tribe_says', cases0: passes, cases: 100, setup: (c, rnd) => { c.regs.b = rnd(0x25); c.regs.c = rnd(6); } });
process.exitCode = f ? 1 : 0;
