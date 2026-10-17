#!/usr/bin/env node
// Hold the Maps page to the room tables. Its storm-machine block must be the one every page carries,
// index.html's, which test_machine.js checks room by room against the kit's simulator. Here roomMap must place each of
// the 100 rooms exactly once on room_map ($471C), decoded independently below, and every doorway in
// exit_bits ($179B) must lead to a room with a doorway back, as the page's caption says.
// It exits 1 on any difference.
//   node games/c64/storm/test_levels.js [levels.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'levels.html';
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
g.sameBlock('storm-machine', page);   // every page's copy, and the page tested
const { roomMap, roomRecords } = g.run(page, 'storm-machine', 'roomMap', 'roomRecords');
const ram = g.listing().ram, M = roomMap(ram);
const seen = new Array(100).fill(0);
for (let i = 0; i < 192; i++) {
  const b = ram[0x471C + i], want = b === 0xFF ? -1 : 10 * (b >> 4) + (b & 15);
  if (M.place[i] !== want) fail('place', i, M.place[i], 'not', want);
  if (want >= 0) { seen[want]++; if (M.at[want] !== i) fail('room', want, 'at', M.at[want], 'not', i); }
}
seen.forEach((n, r) => { if (n !== 1) fail('room', r, 'is on the map', n, 'times'); });
let doors = 0;
const exits = (r) => { const e = ram[0x179B + (r >> 1)]; return r & 1 ? e & 15 : e >> 4; };
for (let r = 0; r < 100; r++) {
  if (roomRecords(ram, r).exits !== exits(r)) fail('room', r, 'exits');
  for (const [bit, step, back] of [[8, -16, 4], [4, 16, 8], [2, -1, 1], [1, 1, 2]]) {
    if (!(exits(r) & bit)) continue;
    doors++;
    const i = M.at[r], j = i + step, n = j >= 0 && j < 192 && (bit > 2 || (j >> 4) === (i >> 4)) ? M.place[j] : -1;
    if (n < 0) fail('room', r, 'has a doorway to no room');
    else if (!(exits(n) & back)) fail('room', r, 'has a doorway to room', n, 'which has none back');
  }
}
console.log(`100 rooms on the map once each, ${doors} doorways each with one back: ${bad ? bad + ' differences' : 'all as the tables say'}`);
process.exit(bad ? 1 : 0);
