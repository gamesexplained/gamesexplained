#!/usr/bin/env node
// Hold the page's three lookups (index.html's bb-rules block) against the game's own code, run on
// the kit's 6502 over side 1's listing:
// - bbStickMove against find_stick ($84FA), stick_row ($8508) and stick_to_move ($853B), called as
//   computer_moves calls them, for every move $80-$9D and every stick value 0-$1F, with next_move
//   ($6B) clear: the move ($67) they leave, and the row entry they leave in next_move.
// - bbAiPick against computer_moves ($8598) in a one-player game (demo off, players 0, every flag
//   that stops it clear), fighter 0 the opponent: the stick value it hands find_stick (a hook at
//   $84FA), for every skill level, opponent pose and distance at one count, and for every level and
//   count at a spread of poses and distances. The count is ai_counter ($CD) before the routine's
//   inc, so the port is given that plus one.
// - bbHit against hit_test ($8662) with fighter 1 the attacker: the record address it reads its
//   first byte from (a hook at $869B, the and that tests the reach) and whether a blow lands (a hook
//   at $869F), for each of the twelve blows, every victim pose $00-$5A and distances 0-8. A record
//   read from the I/O chips ($D000-$DFFF) is followed up to its address only: what the chips give
//   back is not the listing's.
// It exits 1 on any difference.
//   node games/c64/barbarian/test_rules.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('bb-rules');
const { bbStickMove, bbAiPick, bbHit } = g.run(page, 'bb-rules', 'bbStickMove', 'bbAiPick', 'bbHit');
const L = g.listing('parts/practice/listing.json');
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const h = (n) => '$' + n.toString(16);
const io = { read() { return 0xFF; }, write() {} };
function machine() {
  const m = L.ram.slice();
  for (const a of [0xAF, 0xB2, 0xB3, 0xB4, 0xB5, 0xBA, 0xBB, 0xBD]) m[a] = 0;
  return { m, cpu: new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io }) };
}

// the stick
let nStick = 0;
for (let mv = 0x80; mv <= 0x9D; mv++) for (let v = 0; v < 0x20; v++) {
  const { m, cpu } = machine(), x = 1;
  m[0x67 + x] = mv; m[0x6B + x] = 0; m[0x69 + x] = 7; m[0x81] = 0xF0; m[0x82] = 0xCC;
  cpu.call(0x84FA, { a: v, x });
  cpu.call(0x8508, { x, y: cpu.y });
  cpu.call(0x853B, { x, y: cpu.y });
  const r = bbStickMove(L.ram, mv, v);
  const want = mv === 0x9A && r.dir === 0 ? mv : r.move;      // the taunt, kept while the stick is centred
  const changed = want !== mv;
  if (m[0x67 + x] !== want) fail('stick', h(mv), h(v), 'game', h(m[0x67 + x]), 'port', h(want));
  if (changed && m[0x6B + x] !== r.entry) fail('stick next_move', h(mv), h(v), h(m[0x6B + x]), h(r.entry));
  nStick++;
}

// the computer
let nAi = 0;
function ai(level, pose, dist, count) {
  const { m, cpu } = machine();
  m[0xBE] = level; m[0x6F] = pose; m[0x71] = 0; m[0x72] = dist; m[0xCD] = count;
  m[0x67 + 1] = 0x80; m[0x6B + 1] = 0x80;                       // a move that holds the stick: find_stick is all we want
  let got = -1;
  cpu.call(0x8598, {}, { hooks: { 0x84FA: (c) => { if (got < 0) got = c.a; } } });
  const r = bbAiPick(L.ram, level, pose, dist, (count + 1) & 0xFF);
  if (got !== r.stick) fail('ai', 'level', level, 'pose', h(pose), 'distance', dist, 'count', count, 'game', h(got), 'port', h(r.stick));
  nAi++;
}
for (let level = 0; level < 8; level++) for (let pose = 0; pose < 0x5B; pose++) for (let d = 0; d < 40; d++) ai(level, pose, d, 0x11);
for (let level = 0; level < 8; level++) for (let count = 0; count < 256; count++)
  for (const [pose, d] of [[0, 0], [0, 2], [0x0E, 4], [0x1B, 6], [0x41, 9], [0x58, 14], [0x23, 30]]) ai(level, pose, d, count);

// the blows
let nHit = 0, nLanded = 0, nStray = 0;
for (let b = 0; b < 12; b++) for (let victim = 0; victim < 0x5B; victim++) for (let d = 0; d <= 8; d++) {
  const { m, cpu } = machine();
  const attack = L.ram[0xC1B0 + b];
  m[0x6F + 1] = attack; m[0x6F] = victim; m[0xAA] = d; m[0x88] = 0x5A;
  let addr = null, landed = false, stray = false;
  const ioHits = { read(a) { stray = true; return 0xFF; }, write() {} };
  const c = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io: ioHits });
  try {
    c.call(0x8662, { x: 1 }, { hooks: {
      0x869B: (k) => { addr = m[0x87] | m[0x88] << 8; if (addr >= 0xD000 && addr < 0xE000) return true; },
      0x869F: () => { landed = true; return true; },
    } });
  } catch (e) { fail('hit_test', h(attack), h(victim), d, e.message); continue; }
  const r = bbHit(L.ram, attack, victim, d);
  const want = r.record === null ? null : r.address;
  const got = landed || (addr >= 0xD000 && addr < 0xE000) ? addr : null;
  if (want !== got) fail('hit', 'blow', h(attack), 'victim', h(victim), 'distance', d, 'game', got === null ? 'none' : h(got), 'port', want === null ? 'none' : h(want));
  if (got !== null) nLanded++;
  if (got !== null && (got < 0xC69C || got > 0xC737)) nStray++;
  nHit++;
}
console.log(`stick: ${nStick} cases; computer: ${nAi} cases; blows: ${nHit} cases, ${nLanded} land, ${nStray} of them from outside hit_records: ` +
  (bad ? bad + ' differences' : 'every case matches the game'));
process.exit(bad ? 1 : 0);
