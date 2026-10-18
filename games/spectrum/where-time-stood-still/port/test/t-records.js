'use strict';
// The records alone against the game's, as play calls them; then every record moved from its own
// place in the world, every state of every actor, and the records left behind walking back.
const { check, prefetch, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
// step_round and edge_east leave by their caller's return, so they are checked inside state_follow
// and record_edges
const NAMES = ['area_edges', 'area_east', 'carry_actors', 'carry_actor', 'place_creatures', 'record_ground',
  'drop_far_actors', 'bring_in', 'put_back', 'leader_place', 'actors_pass', 'actor_step', 'state_die', 'state_route',
  'state_stand', 'state_follow', 'walk_to_leader', 'state_fixed', 'state_fetch', 'next_point', 'walk_towards',
  'axis_walk', 'move_records', 'nearest_route', 'near_leader', 'record_edges', 'route_point', 'turn_round',
  'step_record', 'random', 'record_of'];
const ENTRIES = [0xDB56, 0xDB75, 0xDB88, 0xDEBD, 0xE033, 0xE3BB];
const OUTS = { record_of: ['hl'], random: ['a'], walk_towards: ['a', 'zf'], axis_walk: ['a', 'zf'], near_leader: ['zf'],
  route_point: ['a', 'hl', 'de'], step_record: ['c', 'de'], nearest_route: ['de'], 0xE3BB: ['hl', 'de'] };
prefetch(NAMES.concat(ENTRIES), MIX);
for (const name of NAMES) t({ name, outs: OUTS[name] || [] });
for (const entry of ENTRIES) t({ entry, outs: OUTS[entry] || [] });

const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
const put = (c, a, v) => { c.M[a] = v; if (a >= 0xC000) c.banks[3][a - 0xC000] = v; };
// every record in turn, and records left behind (state 1) with no route, near the leader or not
const moves = at('move_records');
t({ name: 'move_records', cases0: moves, cases: 400, setup: (c, rnd) => { put(c, 0xEAC6, rnd(0x2E)); } });
t({ name: 'move_records', cases0: moves, cases: 300, setup: (c, rnd) => {
  const n = rnd(0x2E);
  put(c, 0xEAC6, (n + 0x2D) % 0x2E);
  const rec = 0xEB05 + 8 * n;
  if (c.M[rec + 1] & 0x80) return false;
  put(c, rec + 1, 1);
  put(c, rec + 6, 0);
  if (rnd(2)) {
    put(c, rec + 2, c.M[0x8D1F]);
    put(c, rec + 3, (c.M[0xDB05] + rnd(0x60) - 0x30) & 255);
    put(c, rec + 4, (c.M[0xDB06] + rnd(0x60) - 0x30) & 255);
  }
} });
// every state of every actor in play, its countdown run out
const steps = at('actor_step');
t({ name: 'actor_step', cases0: steps, cases: 600, setup: (c, rnd) => {
  const iy = c.regs.iy;
  if (c.M[iy + 1] === 0xFF) return false;
  c.M[iy + 4] &= 0xF0;
  c.M[iy + 1] = (c.M[iy + 1] & 0xF0) | [0, 1, 1, 3, 7, 8, 9][rnd(7)];
  if (rnd(3) === 0) c.M[iy + 0x18] ^= 0x20;
} });
// the leader walking off each edge of the area into another of the four by four
const edges = at('area_edges');
t({ name: 'area_edges', cases0: edges, cases: 120, setup: (c, rnd) => {
  const area = c.M[0x8D1F], k = rnd(4);
  if (k === 0 && (area & 3) !== 3) c.M[0x9633] = 0xE4 + rnd(14);
  else if (k === 1 && (area & 3)) c.M[0x9633] = 0xF2 + rnd(14);
  else if (k === 2 && area < 12) c.M[0x9634] = 0x6C + rnd(20);
  else if (k === 3 && area >= 4) c.M[0x9634] = 0x80 + rnd(128);
  else return false;
} });
process.exitCode = f ? 1 : 0;
