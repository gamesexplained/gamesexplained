'use strict';
// The rope rescue and the end alone against the game's, as play calls them; then a rescue planted
// at every stage, Clive hanging, the rope drawn, and the end reached and drawn with any score.
const { check, prefetch, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
// rope_end is reached by a RET, so it is checked inside draw_rope
const NAMES = ['state_pull', 'state_throw', 'state_haul', 'back_to_follow', 'clive_falls', 'rope_timer', 'draw_rope',
  'turn_marker', 'game_end', 'end_screen', 'pity_line'];
const ENTRIES = [0xE5A4, 0xD838, 0xD8E3, 0xCD39, 0x9306];
prefetch(NAMES.concat(ENTRIES), MIX);
for (const name of NAMES) t({ name });
for (const entry of ENTRIES) t({ entry });

const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
const put = (c, a, v) => { c.M[a] = v; if (a >= 0xC000) c.banks[3][a - 0xC000] = v; };
const putw = (c, a, v) => { put(c, a, v & 255); put(c, a + 1, v >> 8); };
const inPlay = c => { const l = []; for (let a = 0x8300; a < 0x8400; a += 0x20) if (c.M[a + 1] !== 0xFF) l.push(a); return l; };
// a rescue under way: the rescuer and Clive among the actors in play, Clive hanging or not
const rescue = (c, rnd) => {
  const l = inPlay(c);
  if (l.length < 2) return false;
  const res = l[rnd(l.length)], cl = l[rnd(l.length)];
  if (res === cl) return false;
  putw(c, 0xFA9F, res); putw(c, 0xFA9D, cl);
  put(c, 0xFA9C, rnd(4) ? 3 : 0xFF);
  c.M[cl] = rnd(4) ? 3 : c.M[cl];
  c.M[0x8D11] = [0, 1, 5, 0x40, 0xBF, 0xFF, 0xFF][rnd(7)];
  c.M[cl + 0x12] = rnd(2) ? 0x80 + rnd(0x80) : rnd(0x40); c.M[cl + 0x13] = c.M[cl + 0x12] & 0x80 ? 0xFF : 0;
  put(c, 0xED4F, rnd(2) ? 0x11 : 0x12); put(c, 0xED55, rnd(0x50));
  return true;
};
// the rescuer pulling, throwing and hauling
const steps = at('actor_step');
t({ name: 'actor_step', cases0: steps, cases: 600, setup: (c, rnd) => {
  if (!rescue(c, rnd)) return false;
  const iy = rnd(2) ? c.M[0xFA9F] | c.M[0xFAA0] << 8 : c.M[0xFA9D] | c.M[0xFA9E] << 8;
  c.regs.iy = iy; c.regs.h = iy >> 8; c.regs.l = iy & 255;
  c.M[iy + 4] &= 0xF0;
  c.M[iy + 1] = (c.M[iy + 1] & 0xF0) | [4, 5, 6][rnd(3)];
} });
// Clive on ground $74
t({ name: 'clive_falls', cases0: steps, cases: 300, setup: (c, rnd) => {
  if (!rescue(c, rnd)) return false;
  const cl = c.M[0xFA9D] | c.M[0xFA9E] << 8;
  c.regs.iy = cl; c.regs.d = cl >> 8; c.regs.e = cl & 255;
  c.M[cl + 1] = rnd(5) ? rnd(16) : 5;
} });
// the rope drawn between them
const passes = at('next_message');
t({ name: 'draw_rope', cases0: passes, cases: 300, setup: (c, rnd) => {
  if (!rescue(c, rnd)) return false;
  c.M[0x8D12] = 0xFF;
} });
// the turn marker for each character
t({ name: 'turn_marker', cases0: steps, cases: 200, setup: (c, rnd) => {
  const l = inPlay(c), a = l[rnd(l.length)];
  c.regs.h = a >> 8; c.regs.l = (a + 0x0B) & 255;
  c.M[0x8D1C] = rnd(4) << 4 | (rnd(4) ? 0 : rnd(16));
} });
// the end reached, with any score and any of the party within reach, and drawn
const score = (c, rnd) => { c.M[0x8D04] = rnd(2); c.M[0x8D05] = rnd(10); c.M[0x8D06] = rnd(10); c.M[0x8D07] = rnd(10); c.M[0x8D08] = rnd(10); };
t({ name: 'game_end', cases0: passes, cases: 200, setup: (c, rnd) => {
  c.M[0x8D10] = rnd(5) ? 0 : 0xFF;
  score(c, rnd);
  const l = inPlay(c), a = l[rnd(l.length)];
  c.regs.h = a >> 8; c.regs.l = a & 255;
} });
t({ name: 'end_screen', cases0: passes, cases: 200, setup: (c, rnd) => {
  score(c, rnd);
  c.M[0xBF2D] = rnd(3) ? 1 + rnd(200) : 0;
  for (let k = 0; k < 4; k++) put(c, 0xE4BE + k, rnd(3) ? 0 : 1 + rnd(255));
  for (let k = 0; k < 4; k++) put(c, 0xEA91 + k, 0);
  c.M[0x8D0A] = rnd(4);
} });
process.exitCode = f ? 1 : 0;
