#!/usr/bin/env node
// Hold the Maps page's room builder against the game's own code. levels.html's td-rooms block
// (tdBuildRoom, tdUnpack) builds a room's map from the listing's bytes. Here the game's own
// routines run on the kit's simulator over the whole listing, as build_room ($388D) runs them:
// clear_room_map ($3BBB), unpack_room ($3BD7) with X = the room's type ($1BC0 & $7F) and carry
// clear, then room_extra ($3D0A) with the player's room in $48 and the death count in $C8. The
// room map, $0C00-$1AFF, must be the same byte for byte, and the picture's columns ($30, $2F) the
// same, for every room 0-29, with no deaths and with two. Every record 0-16 is also unpacked alone,
// centred and from the left, and compared. It exits 1 on any difference.
//   node games/c64/the-detective/test_rooms.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { tdBuildRoom, tdUnpack } = g.run('levels.html', 'td-rooms', 'tdBuildRoom', 'tdUnpack');
const L = g.listing();
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
function gameMap(m) { return m.subarray(0x0C00, 0x1B00); }
function compare(what, m, map) {
  const gm = gameMap(m);
  for (let i = 0; i < gm.length; i++) if (gm[i] !== map[i]) { fail(what, 'row', i >> 8, 'column', i & 255, 'game', gm[i], 'page', map[i]); return; }
}
// every room, as build_room builds it
for (let room = 0; room < 30; room++) for (const deaths of [0, 2]) {
  const m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io });
  m[0x48] = room; m[0xC8] = deaths;
  m.fill(0x20, 0x0C00, 0x1B00);   // $3BBB clears columns 0-191 only; build_room blanks the rest at $3954
  cpu.call(0x3BBB, {});
  const type = m[0x1BC0 + room] & 0x7F;
  m[0xC7] = type;
  cpu.call(0x3BD7, { x: type, c: 0 }, { maxSteps: 2000000 });
  const left = m[0x30], right = m[0x2F];
  cpu.call(0x3D0A, {}, { maxSteps: 2000000 });
  const page = tdBuildRoom(L.ram, room, deaths);
  compare('room ' + room + ' deaths ' + deaths, m, page.map);
  if (page.left !== left) fail('room', room, 'left column game', left, 'page', page.left);
  if ((m[0x1BC0 + room] & 0x80) === 0 && page.right !== right) fail('room', room, 'right column game', right, 'page', page.right);
  if ((m[0x1BC0 + room] & 0x80) && page.right !== m[0x2F]) fail('room', room, 'widened right column game', m[0x2F], 'page', page.right);
  cases++;
}
// every record alone
for (let n = 0; n < 17; n++) for (const fromLeft of [false, true]) {
  const m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io });
  m.fill(0x20, 0x0C00, 0x1B00);
  cpu.call(0x3BD7, { x: n, c: fromLeft ? 1 : 0 }, { maxSteps: 2000000 });
  const map = new Uint8Array(15 * 256).fill(0x20);
  const r = tdUnpack(L.ram, n, map, fromLeft);
  compare('record ' + n + (fromLeft ? ' from the left' : ' centred'), m, map);
  if (r.left !== m[0x30] || r.right !== m[0x2F]) fail('record', n, 'columns game', m[0x30], m[0x2F], 'page', r.left, r.right);
  if ((cpu.portRead(1) & 7) !== 5) fail('record', n, '$01 left at', cpu.portRead(1));
  cases++;
}
console.log(cases + ' cases: ' + (bad ? bad + ' differences' : 'every room map matches the game\'s own code'));
process.exit(bad ? 1 : 0);
