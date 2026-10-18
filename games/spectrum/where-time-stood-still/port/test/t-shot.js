'use strict';
// The shots, the scans along a line and the score alone against the game's, as play calls them
// with the player walking, firing and opening menus.
const { check, prefetch } = require('./check.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
const ROUTINES = [
  ['move_shots'], ['shot_step'], ['shot_end'], ['project', ['hl', 'de']], ['screen_address', ['hl']],
  ['next_shot', ['zf', 'bc', 'bc_']], ['draw_shot'], ['draw_any_shot'], ['shot_line', ['zf']], ['shot_advance'],
  ['shot_offsets', ['de']], ['shot_path'], ['enemy_shot_hit'], ['can_fire', ['zf', 'de']], ['fire'], ['shot_collapse'],
  ['shot_hits'], ['muzzle', ['hl', 'de']], ['shot_visible', ['zf']], ['clip_falling', ['zf', 'hl']],
  ['view_limits', ['bc', 'hl']], ['own_place', ['bc', 'bc_']], ['scan_actors', ['a', 'zf']], ['scan_down', ['a', 'zf']],
  ['scan_boxes'], ['add_percent'],
];
const ENTRIES = [[0xE88C, ['bc', 'hl']], [0xF3A3, ['a', 'zf']], [0xF3AA, ['a', 'zf']], [0xF3AD, ['a', 'zf']], [0xF452, []],
  [0xE4A6, []], [0xE4AC, []]];
prefetch(ROUTINES.map(r => r[0]).concat(ENTRIES.map(e => e[0])), MIX);
for (const [name, outs] of ROUTINES) t({ name, outs: outs || [] });
for (const [entry, outs] of ENTRIES) t({ entry, outs });

// --- shots planted where play had none: every direction, enemies' shots, other targets ---
const { entries } = require('./check.js');
const { labels } = require('./standin.js');
const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
// bank 3's bytes go into its bank, and into memory as the processor sees it when it is paged in
const poke = (c, a, v) => {
  if (a >= 0xC000) { c.banks[3][a - 0xC000] = v & 255; if ((c.paging & 7) !== 3) return; }
  c.M[a] = v & 255;
};
const pokew = (c, a, v) => { poke(c, a, v & 255); poke(c, a + 1, (v >> 8) & 255); };
const wd = (c, a) => c.M[a] | c.M[a + 1] << 8;
const proj = (c, h) => {
  const along = wd(c, h), down = wd(c, h + 2), height = wd(c, h + 4);
  pokew(c, h + 6, ((down + 0x200 - along) & 0xFFFF) * 2);
  pokew(c, h + 8, (0x607 - height - down - along) & 0xFFFF);
};
// a shot for actor k (one in play, mostly) from near its place: direction dir, the end `len` on
const plant = (c, rnd, enemy, len, dirs) => {
  const live = [0, 1, 2, 3, 4, 5, 6, 7].filter(k => c.M[0x8301 + 32 * k] !== 0xFF);
  const k = live.length && rnd(4) ? live[rnd(live.length)] : rnd(8);
  const s = 0xC100 + 24 * k, a = 0x8300 + 32 * k, dir = enemy ? rnd(4) : rnd(dirs || 5);
  poke(c, s, 0x80 | dir | (enemy ? 0x40 : 0));
  poke(c, s + 1, enemy ? rnd(16) : 0);
  for (let i = 0; i < 3; i++) pokew(c, s + 2 + 2 * i, wd(c, a + 0x0E + 2 * i) + rnd(25) - 12);
  proj(c, s + 2);
  for (let i = 0; i < 10; i++) poke(c, s + 0x0C + i, c.M[s + 2 + i]);
  if (len) {
    const off = s + 0x0C + (dir & 1 ? 2 : 0), sign = dir & 2 ? -1 : 1;
    if (dir === 4) pokew(c, s + 0x10, wd(c, s + 0x10) - len); else pokew(c, off, wd(c, off) + sign * len);
    proj(c, s + 0x0C);
  }
  pokew(c, 0xC218, s);
  c.regs.h = s >> 8; c.regs.l = s & 255;
  return s;
};
const steps = at('move_shots'), draws = at('next_shot');
t({ name: 'shot_step', cases0: steps, cases: 400, setup: (c, rnd) => { plant(c, rnd, false, 0); } });
t({ name: 'shot_step', cases0: steps, cases: 60, setup: (c, rnd) => { plant(c, rnd, true, 0); } });
t({ name: 'move_shots', cases0: steps, cases: 200, setup: (c, rnd) => { plant(c, rnd, rnd(4) === 0, 0); if (rnd(2)) plant(c, rnd, rnd(3) === 0, 0); } });
t({ name: 'draw_any_shot', cases0: draws, cases: 400, setup: (c, rnd) => { plant(c, rnd, true, 0); } });
// the party's shot as the pass before left it: placed, clipped and projected by the port's
// shot_step (checked above), unless that ended it. Only directions 0 to 3: the party fires no
// other (a falling line, 4, planted from below the ground draws into the stack, and the game
// runs wild)
const { side } = require('./check.js');
t({ name: 'draw_any_shot', cases0: draws, cases: 300, setup: (c, rnd) => {
  const s = plant(c, rnd, false, 0, 4);
  const S = side(c, true);
  S.P.shot_step({ hl: s });
  if (S.mem.paged !== (c.paging & 7)) S.mem.page(c.paging & 7);
  c.M = S.M.slice();
  for (let n = 0; n < 8; n++) c.banks[n] = S.mem.bank(n).slice();
  if (c.M[s] === 0xFF) return false;
  pokew(c, 0xC218, s);
} });
t({ name: 'enemy_shot_hit', cases0: draws, cases: 300, setup: (c, rnd) => {
  const s = plant(c, rnd, true, 0); poke(c, s + 1, rnd(5)); c.regs.l = (s + 1) & 255;
} });
t({ name: 'next_shot', cases0: draws, cases: 200, setup: (c, rnd) => { for (let n = 1 + rnd(3); n; n--) plant(c, rnd, rnd(2) === 0, 0); } });
// fire by any type under $10, with or without ammunition, its shot free or not
t({ name: 'fire', cases: 300, setup: (c, rnd) => {
  const iy = c.regs.iy, t0 = rnd(4) ? rnd(16) : rnd(256);
  c.M[iy] = t0;
  if (t0 < 4) c.M[0xD5C7 + t0 * 8] = [0, 1, 2, 3, 40][rnd(5)];
  const k = (iy & 0xE0) >> 5; poke(c, 0xC100 + 24 * k, rnd(4) ? 0xFF : 0x80);
  c.M[iy + 0x0D] = rnd(256);
} });
// a hit on any type: the party's strength, the people's hostility at the altar, hits left
t({ name: 'shot_hits', cases0: steps, cases: 400, setup: (c, rnd) => {
  const k = rnd(8), a = 0x8300 + 32 * k, t0 = rnd(0x30);
  c.M[a] = t0 | (rnd(4) ? 0 : 0x40);
  pokew(c, 0xF00F, a);
  if (t0 < 4) c.M[0xD5C3 + t0 * 8] = rnd(64);
  if (rnd(3) === 0) { poke(c, 0xFB5D, 4); c.M[0x8D15] = [0, 1, 5, 0xFF][rnd(4)]; }
  if (t0 >= 0x18) poke(c, 0xC208 + ((t0 - 0x18) & 7), 1 + rnd(2));
  for (let i = 0; i < 5; i++) c.M[0x8D04 + i] = rnd(10);
} });
for (const [o, b] of [[{ name: 'add_percent' }, 0], [{ entry: 0xE4A6 }, 0], [{ entry: 0xE4AC }, 1]]) {
  t(Object.assign({ cases0: steps, cases: 100, setup: (c, rnd) => {
    for (let i = 0; i < 5; i++) c.M[0x8D04 + i] = [9, 9, 0, 5, rnd(10)][rnd(5)];
    c.regs.b = 1 + rnd(40);
    if (b) { const hl = 0x8D04 + rnd(5); c.regs.h = hl >> 8; c.regs.l = hl & 255; }
  } }, o));
}
process.exitCode = f ? 1 : 0;
