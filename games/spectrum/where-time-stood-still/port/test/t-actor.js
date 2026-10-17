'use strict';
// The actors' moves alone against the game's: as play calls them, then every move tried a little
// way off where the game tried it, onto other ground, into other actors and boxes.
const { check, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, o)).fails ? 1 : 0; };
const L = labels();
const at = name => entries(L.byName.get(name).a, -1, {});
t({ name: 'animate_actors' });
t({ name: 'follow_actor' });
t({ name: 'animation_event' });
t({ name: 'event_stun' });
t({ name: 'event_clear' });
t({ name: 'try_move', outs: ['zf'] });
t({ name: 'box_collide', outs: ['zf'] });
t({ name: 'actor_collide', outs: ['zf'] });
t({ name: 'ground_allows', outs: ['zf'] });
t({ name: 'ground_cell_at', outs: ['a', 'hl'] });
t({ name: 'ground_cell', outs: ['a', 'hl'] });
t({ name: 'ground_slope', outs: ['zf'] });
t({ name: 'clear_ground_flag', outs: ['zf'] });
t({ name: 'turn_aside', outs: ['zf'] });
t({ name: 'find_cell_near', outs: ['zf', 'h', 'l'] });
for (let g = 0x72; g <= 0x7E; g++) {
  const name = { 0x72: 'ground_72', 0x73: 'ground_73', 0x74: 'ground_74', 0x75: 'ground_75', 0x76: 'ground_76', 0x77: 'ground_77',
    0x78: 'ground_78', 0x79: 'ground_79', 0x7A: 'ground_7a', 0x7B: 'ground_7b', 0x7C: 'ground_7c', 0x7D: 'ground_7d', 0x7E: 'ground_7e' }[g];
  t({ name, outs: ['zf'] });
}
// the move tried a little way off: up to 24 units across and down, 16 up or down
const moves = at('try_move');
const near = (c, rnd) => {
  const M = c.M, nudge = (a, n) => { const v = ((M[a] | M[a + 1] << 8) + rnd(2 * n + 1) - n) & 0xFFFF; M[a] = v & 255; M[a + 1] = v >> 8; };
  nudge(0x8ED1, 24); nudge(0x8ED3, 24); nudge(0x8ED5, 16);
};
for (const name of ['try_move', 'ground_allows', 'box_collide', 'actor_collide']) t({ name, cases0: moves, cases: 400, setup: near, outs: ['zf'] });
// a cell value looked for near the leader
t({ name: 'find_cell_near', cases0: at('find_cell_near').concat(moves), cases: 200, outs: ['zf', 'h', 'l'], setup: (c, rnd) => {
  c.regs.a = 0x70 + rnd(16);
} });
// every special ground ($72 to $7E) under the move, for any actor, at any height
const special = g => (c, rnd) => {
  near(c, rnd);
  const M = c.M, w = a => M[a] | M[a + 1] << 8;
  const de = (((w(0x8ED1) + w(0x90E2)) & 0xFFF0) * 4) & 0xFFFF;
  const cell = (0xC000 + ((((w(0x8ED3) + w(0x90F0)) & 0xFFFF) >> 4) & 0x3F) + de) & 0xFFFF;
  c.banks[1][cell - 0xC000] = g;
  if ((c.paging & 7) === 1) M[cell] = g;
  if (rnd(3) === 0) { M[0x8ED5] = rnd(2) ? 0 : rnd(32); M[0x8ED6] = 0; }
  if (rnd(4) === 0) M[0x8ED0] = 0x75 + rnd(2);
};
for (let g = 0x72; g <= 0x7E; g++) t({ name: 'ground_allows', cases0: moves, cases: 60, setup: special(g), outs: ['zf'] });
process.exitCode = f ? 1 : 0;
