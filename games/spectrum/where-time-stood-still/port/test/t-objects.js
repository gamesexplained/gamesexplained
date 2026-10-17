'use strict';
// The objects alone against the game's, as play calls them; then objects strewn about the area and
// the next ones, carried from areas around, put down and dropped, and every object used with its
// stores full, low or empty and its icon shown or not.
const { check, prefetch, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
const NAMES = ['objects_pass', 'next_object', 'draw_object', 'carry_objects', 'drop_object_ground', 'put_down', 'place_object',
  'object_screen', 'use_dynamite', 'use_bag', 'use_knife', 'consume', 'icon_slot', 'use_first_aid', 'use_bottle',
  'bottle_filled', 'use_ham', 'use_tin', 'use_ammunition', 'use_watch', 'use_rope', 'drop_all', 'cycle_graphic'];
const ENTRIES = [0xF84B, 0xF8AF, 0xFA3E, 0xFA42, 0xFA46, 0xE36B, 0xE370, 0xE375, 0xE37A];
const OUTS = { next_object: ['zf', 'iy', 'bc', 'bc_'], icon_slot: ['zf', 'hl'], object_screen: ['a'] };
prefetch(NAMES.concat(ENTRIES), MIX);
for (const name of NAMES) t({ name, outs: OUTS[name] || [] });
for (const entry of ENTRIES) t({ entry, outs: OUTS[entry] || [] });

const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
const setHL = (c, v) => { c.regs.h = v >> 8; c.regs.l = v & 255; };
const setDE = (c, v) => { c.regs.d = v >> 8; c.regs.e = v & 255; };
const put = (c, a, v) => { c.M[a] = v; if (a >= 0xC000) c.banks[3][a - 0xC000] = v; };
const inPlay = c => { const l = []; for (let a = 0x8300; a < 0x8400; a += 0x20) if (c.M[a + 1] !== 0xFF) l.push(a); return l; };
const rec = k => 0xECD8 + 7 * k;
// objects strewn about this area and the ones around it, near the view or not, marked or not
const strew = (c, rnd) => {
  const area = c.M[0x8D1F];
  for (let k = 0; k < 0x14; k++) {
    if (rnd(2)) continue;
    const r = rec(k);
    const n = [0, 1, -1, 3, -3, 4, -4, 5, -5, 2, 6][rnd(11)];
    put(c, r + 1, ((area + n) & 0x3F) | (rnd(4) ? 0 : 0xC0));
    put(c, r + 2, rnd(256)); put(c, r + 3, rnd(256)); put(c, r + 4, rnd(16));
    put(c, r + 5, rnd(2) ? (c.M[0x9633] + rnd(0x30) - 8) & 255 : [rnd(0x20), 0xE0 + rnd(0x20)][rnd(2)]);
    put(c, r + 6, rnd(2) ? (c.M[0x9634] + rnd(0x24) - 8) & 255 : [rnd(0x18), 0x68 + rnd(0x18)][rnd(2)]);
  }
};
const passes = at('objects_pass');
t({ name: 'objects_pass', cases0: passes, cases: 300, setup: strew });
t({ name: 'carry_objects', cases0: passes, cases: 300, setup: strew });
t({ name: 'next_object', cases0: at('next_object'), cases: 300, outs: OUTS.next_object, setup: (c, rnd) => {
  strew(c, rnd);
  c.regs.b = rnd(2); c.regs.c = rnd(256);
  c.regs.bc_ = rnd(0x400);
} });
t({ name: 'draw_object', cases0: passes, cases: 100, setup: (c, rnd) => { strew(c, rnd); setHL(c, rec(rnd(0x14))); } });
t({ name: 'object_screen', cases0: passes, cases: 100, outs: ['a'], setup: (c, rnd) => { strew(c, rnd); setDE(c, rec(rnd(0x14)) + 3); } });
for (const entry of [0xE36B, 0xE370, 0xE375, 0xE37A]) {
  t({ entry, cases0: passes, cases: 50, setup: (c, rnd) => { strew(c, rnd); setDE(c, rec(rnd(0x14)) + (entry < 0xE375 ? 4 : 2)); } });
}
// one of the party picked in menu 2, carrying things, the bag open or not, in a zone or not
const party = (c, rnd) => {
  const l = inPlay(c).filter(a => c.M[a] < 4);
  const ch = l.length && rnd(4) ? c.M[l[rnd(l.length)]] : rnd(4);
  put(c, 0xD0B0, 0x80 | ch);
  for (let k = 0; k < 0x11; k++) if (rnd(4) === 0) put(c, rec(k) + 1, 0x20 | ch);
  put(c, 0xC898, rnd(2) ? c.M[0xC898] | 2 : c.M[0xC898] & 0xFD);
  for (let k = 0; k < 4; k++) put(c, 0xC894 + k, rnd(2) ? rnd(0x11) : 0);
  put(c, 0xFB5D, rnd(3) ? 0xFF : rnd(9));
  return ch;
};
// menu 2's object slots holding some of the objects' icons
const slots = (c, rnd) => { for (let k = 0; k < 4; k++) put(c, 0xD0BF + 5 * k, rnd(3) ? 0x0D + rnd(0x11) : 5); };
t({ name: 'drop_object_ground', cases0: passes, cases: 200, setup: (c, rnd) => { party(c, rnd); put(c, 0xC891, rnd(0x11)); } });
t({ name: 'place_object', cases0: passes, cases: 100, setup: (c, rnd) => {
  const l = inPlay(c);
  setDE(c, rec(rnd(0x14)) + 1); setHL(c, l[rnd(l.length)]);
} });
t({ name: 'drop_all', cases0: passes, cases: 150, setup: (c, rnd) => {
  const ch = party(c, rnd), l = inPlay(c).filter(a => c.M[a] === ch);
  setHL(c, (l.length ? l[0] : inPlay(c)[0]) + 0x0B);
} });
// every object used through USE ITEM, with the stores, needs and tins at any level
const stores = (c, rnd) => {
  for (let k = 0; k < 4; k++) put(c, 0xF627 + k, rnd(2) ? 0xFF : 0);
  for (let a = 0xF62B; a < 0xF633; a++) put(c, a, [0, 1, 0x20, 0x80, 0xFF, rnd(256)][rnd(6)]);
  for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) put(c, 0xD5C3 + 8 * k + j, rnd(256));
  put(c, 0xBF2C, rnd(24)); put(c, 0xFA9C, rnd(3) ? 3 : 0xFF);
};
t({ entry: 0xF84B, cases0: passes, cases: 600, setup: (c, rnd) => {
  party(c, rnd); slots(c, rnd); stores(c, rnd);
  const k = rnd(4);
  put(c, 0xD0BF + 5 * k, 0x0D + rnd(0x11));
  setHL(c, 0xD0BF + 5 * k + 3);
} });
for (const name of ['use_knife', 'use_first_aid', 'use_bottle', 'use_tin', 'use_ammunition', 'use_watch', 'use_rope', 'use_dynamite']) {
  t({ name, cases0: passes, cases: 100, setup: (c, rnd) => { party(c, rnd); slots(c, rnd); stores(c, rnd); } });
}
t({ entry: 0xF8AF, cases0: passes, cases: 100, setup: (c, rnd) => { party(c, rnd); slots(c, rnd); stores(c, rnd); } });
t({ name: 'bottle_filled', cases0: passes, cases: 100, setup: (c, rnd) => {
  slots(c, rnd);
  const l = inPlay(c), a = l[rnd(l.length)];
  setHL(c, a); c.regs.iy = a;
} });
t({ name: 'icon_slot', cases0: passes, cases: 100, outs: ['zf', 'hl'], setup: (c, rnd) => { slots(c, rnd); c.regs.a = 0x0D + rnd(0x12); } });
t({ name: 'cycle_graphic', cases0: passes, cases: 50, setup: (c, rnd) => { put(c, 0xFB1C, [0, 1, 2, 3, 0xFF][rnd(5)]); } });
process.exitCode = f ? 1 : 0;
