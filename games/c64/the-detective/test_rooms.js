#!/usr/bin/env node
// Hold the Maps page's room builder against the game's own code. levels.html's td-rooms block
// (tdBuildRoom, tdUnpack) builds a room's map from the listing's bytes. Here the game's own
// routines run on the kit's simulator over the whole listing, as build_room ($388D) runs them:
// clear_room_map ($3BBB), unpack_room ($3BD7) with X = the room's type ($1BC0 & $7F) and carry
// clear, then room_extra ($3D0A) with the player's room in $48 and the death count in $C8. The
// room map, $0C00-$1AFF, must be the same byte for byte, and the picture's columns ($30, $2F) the
// same, for every room 0-29, with no deaths and with two. Every record 0-16 is also unpacked alone,
// centred and from the left, and compared. Then the whole of build_room ($388D) runs for every room,
// with the doors as the listing holds them and with every door open, and with the state the start of
// a game ($8680) leaves, against tdBuildRoom + tdFinishRoom (doors, floor row, blanking) and tdNewGame:
// the map, the door slots ($1CC0, $1CD4, $1CDE) and the furniture list ($0250) must match. It exits 1
// on any difference.
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
// the whole of build_room ($388D), doors and floor included, against tdBuildRoom + tdFinishRoom: every
// room with the doors as the listing has them, then with every door open, with no deaths and two
const { tdFinishRoom } = g.run('levels.html', 'td-rooms', 'tdFinishRoom');
const quiet = { read() { return 0; }, write() {} };   // build_room blanks the screen ($D011) and sets voice 2 ($D40B)
for (const allOpen of [false, true]) for (let room = 0; room < 30; room++) for (const deaths of [0, 2]) {
  const m = L.ram.slice();
  if (allOpen) for (let d = 0; d < 32; d++) m[0x1F04 + d * 8] |= 1;
  const page = m.slice();
  const cpu = new CPU(m, { port: 0x35, io: quiet });
  m[0x48] = room; m[0xC8] = deaths;
  m.fill(0x20, 0x0C00, 0x1B00);   // row 14 past column 191 is never cleared by the game; spaces, as on the page
  cpu.call(0x388D, {}, { maxSteps: 5000000 });
  const built = tdBuildRoom(page, room, deaths);
  const out = tdFinishRoom(page, room, built);
  compare('build_room ' + room + (allOpen ? ' doors open' : '') + ' deaths ' + deaths, m, built.map);
  if (out.doors.length !== m[0x4A]) fail('room', room, 'doors game', m[0x4A], 'page', out.doors.length);
  out.doors.forEach((d, i) => { if (m[0x1CC0 + i] !== d.col || m[0x1CD4 + i] !== d.type || m[0x1CDE + i] !== d.door) fail('room', room, 'door slot', i); });
  if (out.furniture.length !== m[0x02F6]) fail('room', room, 'furniture game', m[0x02F6], 'page', out.furniture.length);
  out.furniture.forEach((f, i) => { if (m[0x0250 + i] !== f.n) fail('room', room, 'furniture', i, 'game', m[0x0250 + i], 'page', f.n); });
  cases++;
}
// the start of a game ($8680) against tdNewGame: the door table and the room object lists
const { tdNewGame } = g.run('levels.html', 'td-rooms', 'tdNewGame');
{
  const m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io: quiet });
  cpu.call(0x8680, {}, { maxSteps: 100000 });
  const p = tdNewGame(L.ram);
  for (let a = 0x1C40; a < 0x1CC0; a++) if (m[a] !== p[a]) fail('new game, object lists $' + a.toString(16), 'game', m[a], 'page', p[a]);
  for (let a = 0x1F00; a < 0x2000; a++) if (m[a] !== p[a]) fail('new game, doors $' + a.toString(16), 'game', m[a], 'page', p[a]);
  cases++;
  // and every room built from that state
  for (let room = 0; room < 30; room++) {
    const g2 = p.slice(), page = p.slice(), c2 = new CPU(g2, { port: 0x35, io: quiet });
    g2[0x48] = room; g2[0xC8] = 0; g2.fill(0x20, 0x0C00, 0x1B00);
    c2.call(0x388D, {}, { maxSteps: 5000000 });
    const built = tdBuildRoom(page, room, 0);
    const out = tdFinishRoom(page, room, built);
    compare('new game, build_room ' + room, g2, built.map);
    if (out.furniture.length !== g2[0x02F6]) fail('new game, room', room, 'furniture game', g2[0x02F6], 'page', out.furniture.length);
    cases++;
  }
}
console.log(cases + ' cases: ' + (bad ? bad + ' differences' : 'every room map matches the game\'s own code'));
process.exit(bad ? 1 : 0);
