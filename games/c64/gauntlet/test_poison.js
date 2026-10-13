#!/usr/bin/env node
// Hold the page's poison arithmetic against the game's code. index.html's gx-poison block ports
// poison_health ($9F62) and one tick of health_tick ($B933); this runs both routines on the kit's
// 6502 simulator over the committed listing and compares: poison_health for all 256 values of
// the hundreds byte, and one tick for player one from all 65,536 values of the health bytes,
// with the death the routine reports (dead_p1, $C40C). Everything it needs is committed.
//   node games/c64/gauntlet/test_poison.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { poisonHealth, healthTick, ticksToDeath } = g.run(page, 'gx-poison', 'poisonHealth', 'healthTick', 'ticksToDeath');
const L = g.listing();
const m = L.ram.slice();
m[0x97FE] = 0x60;                         // player_leaves stands aside: the test reads $C40C
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } } });
let bad = 0, cases = 0, deaths = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (let hi = 0; hi < 256; hi++) {
  m[0xB931] = hi; cpu.call(0x9F62, { x: 0 }); cases++;
  if (m[0xB931] !== poisonHealth(hi)) fail('poison_health', hi, m[0xB931], poisonHealth(hi));
}
for (let hi = 0; hi < 256; hi++) for (let lo = 0; lo < 256; lo++) {
  m[0x9120] = 1; m[0x9121] = 0; m[0x911E] = 0; m[0xC40C] = 0;     // player one in the game, two out
  m[0xB931] = hi; m[0xB92F] = lo;
  cpu.call(0xB933, {}); cases++;
  const t = healthTick(hi, lo), dead = m[0xC40C] !== 0;
  if (dead) deaths++;
  if (dead !== t.dead || m[0xB931] !== t.hi || m[0xB92F] !== t.lo)
    fail('health_tick', hi.toString(16), lo.toString(16), 'game', m[0xB931].toString(16), m[0xB92F].toString(16), dead, 'page', t.hi.toString(16), t.lo.toString(16), t.dead);
}
const sums = [[0x20, 0x00, 2000], [0x1F, 0x00, 2500], [0xFF, 0x50, 16550]];
for (const [hi, lo, n] of sums) if (ticksToDeath(hi, lo) !== n) fail('ticksToDeath', hi, lo, ticksToDeath(hi, lo), 'expected', n);
console.log(`${cases} cases, ${deaths} deaths, ${bad ? bad + ' differ' : 'every result matches'}`);
process.exit(bad ? 1 : 0);
