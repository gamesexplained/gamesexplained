'use strict';
// The creatures' minds alone against the game's, as play calls them; then every kind of actor
// given the mind, with targets moved near it and victims held, carried off and dragged down, the
// alarm raised, and a new leader picked for each character.
const { check, prefetch, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
// leader_done is reached by a RET, so it is checked inside new_leader
const NAMES = ['alarm_pass', 'route_ended', 'state_gather', 'actor_ai', 'grabber_ai', 'type_10_ai', 'type_14_ai', 'seize',
  'carry_flight', 'drop_victim', 'move_with', 'sink', 'hold_victim', 'look_round', 'look_one_way', 'will_target',
  'face_target', 'set_action', 'coarse_place'];
const ENTRIES = [0xF341];
const OUTS = { look_round: ['a', 'zf'], 0xF341: ['a', 'zf'], will_target: ['zf'], set_action: ['a', 'zf'] };
prefetch(NAMES.concat(ENTRIES, ['actor_step']), MIX);
for (const name of NAMES) t({ name, outs: OUTS[name] || [] });
for (const entry of ENTRIES) t({ entry, outs: OUTS[entry] || [] });

const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
const setHL = (c, v) => { c.regs.h = v >> 8; c.regs.l = v & 255; };
const setDE = (c, v) => { c.regs.d = v >> 8; c.regs.e = v & 255; };
const inPlay = c => { const l = []; for (let a = 0x8300; a < 0x8400; a += 0x20) if (c.M[a + 1] !== 0xFF) l.push(a); return l; };
const other = (c, rnd, iy) => { const l = inPlay(c).filter(a => a !== iy); return l.length ? l[rnd(l.length)] : null; };
const word = (c, a) => c.M[a] | c.M[a + 1] << 8;
const setWord = (c, a, v) => { c.M[a] = v & 255; c.M[a + 1] = (v >> 8) & 255; };
// another actor moved near the one at IY (within 24 units across and down, and a little in height)
const near = (c, rnd, iy) => {
  const o = other(c, rnd, iy);
  if (o === null) return null;
  setWord(c, o + 0x0E, word(c, iy + 0x0E) + rnd(48) - 24);
  setWord(c, o + 0x10, word(c, iy + 0x10) + rnd(48) - 24);
  if (rnd(2)) setWord(c, o + 0x12, word(c, iy + 0x12) + rnd(32) - 16);
  c.M[o + 0x0D] = (c.M[o + 0x0D] & 0xFC) | rnd(4);
  return o;
};
// the actor at IY made one of the kinds, in a state below 8, facing any way, with targets near
// and, for a grabber, a victim held or not
const KINDS = [[0, 3], [4, 0x0F], [0x10, 0x13], [0x14, 0x17], [0x18, 0x1B], [0x1C, 0x1F], [0x20, 0x27]];
const mind = (c, rnd) => {
  const iy = c.regs.iy;
  const [a, b] = KINDS[rnd(KINDS.length)];
  c.M[iy] = a + rnd(b - a + 1);
  c.M[iy + 1] = rnd(8);
  c.M[iy + 0x0B] = rnd(256);
  c.M[iy + 0x0C] = rnd(3) ? rnd(12) : 5;
  c.M[iy + 0x0D] = (c.M[iy + 0x0D] & 0xFC) | rnd(4);
  if (rnd(3)) near(c, rnd, iy);
  if (rnd(2)) near(c, rnd, iy);
  c.M[iy + 5] = 0xFF;
  if (c.M[iy] >= 0x18 && rnd(2)) {
    const v = other(c, rnd, iy);
    if (v !== null) { c.M[iy + 5] = v & 255; c.M[v + 5] = 1 + rnd(12); }
  }
  return iy;
};
const minds = at('actor_ai');
t({ name: 'actor_ai', cases0: minds, cases: 600, setup: (c, rnd) => { mind(c, rnd); } });
// looking: the looker marked as worked on, as actor_ai leaves it
t({ name: 'look_round', cases0: minds, cases: 300, outs: ['a', 'zf'], setup: (c, rnd) => { mind(c, rnd); c.M[c.regs.iy] |= 0x80; } });
t({ entry: 0xF341, cases0: minds, cases: 200, outs: ['a', 'zf'], setup: (c, rnd) => { mind(c, rnd); c.M[c.regs.iy] |= 0x80; c.regs.b = 1; } });
// a target found ($F00F) in any direction, a box or an actor, faced or seized
const target = (c, rnd) => {
  const iy = mind(c, rnd), o = near(c, rnd, iy);
  if (o === null) return false;
  c.M[iy] |= 0x80;
  c.M[0xF00D] = rnd(4);
  setWord(c, 0xF00F, o); c.M[0xF011] = rnd(5) ? o & 255 : 0xFF;
  c.M[0xF00E] = rnd(256);
};
t({ name: 'will_target', cases0: minds, cases: 200, outs: ['zf'], setup: target });
t({ name: 'face_target', cases0: minds, cases: 200, setup: target });
t({ name: 'seize', cases0: minds, cases: 300, outs: ['a'], setup: (c, rnd) => {
  if (target(c, rnd) === false) return false;
  const o = word(c, 0xF00F);
  if (rnd(2)) { setWord(c, o + 0x0E, word(c, c.regs.iy + 0x0E) + rnd(24) - 12); setWord(c, o + 0x10, word(c, c.regs.iy + 0x10) + rnd(24) - 12); }
} });
t({ name: 'set_action', cases0: minds, cases: 100, outs: ['a', 'zf'], setup: (c, rnd) => { c.regs.a = rnd(2) ? c.M[c.regs.iy + 0x0C] : rnd(12); } });
// a grabber holding its victim: carried off at any height, dragged down, dropped, moved
const holding = (c, rnd) => {
  const iy = c.regs.iy, v = other(c, rnd, iy);
  if (v === null) return false;
  c.M[iy] = 0x18 + rnd(16);
  c.M[iy + 5] = v & 255; c.M[v + 5] = 1 + rnd(12);
  c.M[iy + 0x0D] = (c.M[iy + 0x0D] & 0xFC) | rnd(4);
  c.M[iy + 0x12] = rnd(2) ? 0xB8 + rnd(16) : rnd(256);
  if (rnd(3) === 0) c.M[0x8D0A] = c.M[v] & 0x3F;
  setHL(c, iy + 0x0B);
  return v;
};
t({ name: 'carry_flight', cases0: minds, cases: 300, setup: (c, rnd) => { if (holding(c, rnd) === false) return false; } });
t({ name: 'sink', cases0: minds, cases: 200, setup: (c, rnd) => {
  if (holding(c, rnd) === false) return false;
  if (rnd(5) === 0) c.M[c.regs.iy + 5] = 0xFF;
} });
t({ name: 'hold_victim', cases0: minds, cases: 100, setup: (c, rnd) => { if (holding(c, rnd) === false) return false; } });
t({ name: 'drop_victim', cases0: minds, cases: 100, setup: (c, rnd) => {
  const v = holding(c, rnd);
  if (v === false) return false;
  setDE(c, v + 0x14);
} });
t({ name: 'move_with', cases0: minds, cases: 100, setup: (c, rnd) => {
  const v = holding(c, rnd);
  if (v === false) return false;
  setDE(c, v + 0x0E); setHL(c, [0xF014, 0xF01C, 0xF024][rnd(3)]);
} });
t({ name: 'coarse_place', cases0: minds, cases: 100, setup: (c, rnd) => { setHL(c, inPlay(c)[rnd(inPlay(c).length)] + 0x0E); } });
// any actor of type 4 up whose route ends, as the event or as state 0
t({ name: 'route_ended', cases0: minds, cases: 200, setup: (c, rnd) => {
  const l = inPlay(c).filter(a => (c.M[a] & 0x7F) >= 4);
  if (!l.length) return false;
  c.regs.iy = l[rnd(l.length)]; setHL(c, c.regs.iy + 0x0B);
} });
// gathering round the leader, his character too, at any pass
const steps = at('actor_step');
t({ name: 'actor_step', cases0: steps, cases: 300, setup: (c, rnd) => {
  const iy = c.regs.iy;
  if (c.M[iy + 1] === 0xFF) return false;
  c.M[iy + 4] &= 0xF0;
  c.M[iy + 1] = (c.M[iy + 1] & 0xF0) | 2;
  c.M[0x8D1C] = rnd(256);
  if (rnd(3) === 0) c.M[0x8D0A] = c.M[iy] & 0x3F;
} });
// the alarm: any type in slots 1 to 7, held or not, after either alarm
const passes = at('alarm_pass');
t({ name: 'alarm_pass', cases0: passes, cases: 300, setup: (c, rnd) => {
  for (const a of inPlay(c)) if (a !== 0x8300 && rnd(3) === 0) c.M[a] = rnd(0x28);
  if (rnd(4) === 0) { const l = inPlay(c); c.M[l[rnd(l.length)] + 1] |= 0x40; }
  c.M[0xF013] = rnd(3);
  c.M[0xF012] = 1 + rnd(2);
} });
// a new leader for each character, in play or not; the game's $868E is a RET here, and the
// port's stops there too
t({ name: 'new_leader', cases0: passes, cases: 120, setup: (c, rnd) => {
  c.M[0x868E] = 0xC9;
  c.regs.a = 0x0C + rnd(4);
}, port: P => { P.new_game_868e = () => ({}); } });
process.exitCode = f ? 1 : 0;
