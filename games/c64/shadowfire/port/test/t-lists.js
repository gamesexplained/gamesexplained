'use strict';
// The lists' routines (src/g-lists.js), each checked alone against the game's (check.js), on the
// moments of play, with the character, the location and the pages chosen at random.
//   node t-lists.js [cases] [routine]
const { check } = require('./check.js');

const STACK = [[0x100, 0x1FF]];
// a team member as the character, at their own location, and the pages at random
function team(M, chips, rnd) {
  const c = rnd(6), rec = 0xCA0E + 18 * c;
  M[0x41] = rec & 255; M[0x42] = rec >> 8;
  M[0x5436] = c; M[0x5437] = M[rec + 2];
  for (const a of [0x5440, 0x5441, 0x5442, 0x5444, 0x5445]) M[a] = rnd(3) ? 8 * rnd(2) : rnd(20);
  M[0x5446] = rnd(2) ? M[rec + 2] : M[0xCA0E + 18 * rnd(50) + 2];
}
const CHECKS = [
  { name: 'next_object', outs: ['a', 'y', 'c'], setup: (M, c, rnd) => { const p = 0xCD98 + 7 * rnd(41); M[0x2D] = p & 255; M[0x2E] = p >> 8; } },
  { name: 'next_entity', outs: ['a', 'c'], setup: (M, c, rnd) => { const n = rnd(50), p = 0xCA0E + 18 * n; M[0x2D] = p & 255; M[0x2E] = p >> 8; M[0x5447] = n; } },
  { name: 'list_objects_here', outs: ['a', 'x', 'y'], setup: team },
  { name: 'list_objects_carried', outs: ['a', 'x', 'y'], setup: team },
  { name: 'list_people_here', outs: ['a', 'x', 'y'], setup: team },
  { name: 'list_team_beacon1', outs: ['a', 'x', 'y'], setup: team },
  { name: 'list_team_beacon2', outs: ['a', 'x', 'y'], setup: team },
  { name: 'clear_object_icons', outs: ['a', 'x', 'y', 'c'] },
  { name: 'set_transporter_icons', outs: ['a', 'x', 'y', 'c'] },
  { name: 'list_route', outs: ['a', 'x', 'y'], setup: team },
  { name: 'reset_door_icons', outs: ['a', 'x', 'y'] },
];
if (require.main === module) {
  const cases = +(process.argv[2] || 2000), only = process.argv[3];
  let fails = 0;
  for (const o of CHECKS) {
    if (only && o.name !== only) continue;
    fails += check(Object.assign({ cases: Math.min(cases, o.cases || cases), ignore: STACK }, o)).fails;
  }
  process.exitCode = fails ? 1 : 0;
}
module.exports = { CHECKS };
