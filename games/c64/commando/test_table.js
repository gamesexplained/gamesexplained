#!/usr/bin/env node
// Hold the page's high-score table against the game's own code. index.html's commando-table block
// runs beside the game's insert ($09A4) on the kit's 6502 simulator, over the bytes of the
// committed listing, as this copy has it (the walk from entry 7) and as the 1985 release has it
// (entry 6: the bytes at $09A5 and $0A0D are $06 there, the only difference in the routine): every
// score from 0 to 9,999 hundred points against the table the game starts with, and 2,000 random
// scores against each of 200 random tables in order. The table after it, and whether the name
// entry ($0C88) ran, must be the port's. Everything it needs is committed. It exits 1 on any
// difference. The table the page starts from must be the listing's bytes.
//   node games/c64/commando/test_table.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { insertScore, START_BYTES, startTable } = g.run(page, 'commando-table', 'insertScore', 'START_BYTES', 'startTable');
const m = g.listing().ram;
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io: { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } } });
const BCD = (n) => ((n / 1000 | 0) << 12) | ((n / 100 % 10 | 0) << 8) | ((n / 10 % 10 | 0) << 4) | (n % 10);
const START = Array.from({ length: 9 }, (_, i) => ({
  name: Array.from(m.slice(0x0EEE + 8 * i, 0x0EF6 + 8 * i)).join(','), score: m[0x0F36 + 2 * i] << 8 | m[0x0F37 + 2 * i] }));
const NAME = [0x5B, 0x5C, 0x5D, 0x5E, 0x5F, 0x60, 0x61, 0x62];   // ABCDEFGH, as the name entry leaves it at $0506
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
// The table the page draws: its bytes are the listing's, and its scores the listing's scores.
if (START_BYTES !== Array.from(m.slice(0x0EEE, 0x0F48), (b) => b.toString(16).padStart(2, '0')).join('')) fail('the starting table differs from $0EEE-$0F47');
startTable().forEach((e, i) => { if (e.score !== START[i].score) fail(`entry ${i}'s score`); });
function game_(table, score, first) {
  table.forEach((e, i) => {
    e.name.split(',').forEach((c, k) => { m[0x0EEE + 8 * i + k] = +c; });
    m[0x0F36 + 2 * i] = e.score >> 8; m[0x0F37 + 2 * i] = e.score & 255;
  });
  m[0x09A5] = first; m[0x0A0D] = first;
  m[0x04F9] = score >> 8; m[0x04F8] = score & 255;
  NAME.forEach((c, k) => { m[0x0506 + k] = c; });
  let asked = false;
  cpu.call(0x09A4, {}, { hooks: {
    0x0C88: (c) => { asked = true; c.rts(); },             // the name entry: its letters are already at $0506
    0x0A2B: () => true, 0x0883: () => true,                // the table shown, or back to the title
  } });
  return { asked, table: Array.from({ length: 9 }, (_, i) => ({
    name: Array.from(m.slice(0x0EEE + 8 * i, 0x0EF6 + 8 * i)).join(','), score: m[0x0F36 + 2 * i] << 8 | m[0x0F37 + 2 * i] })) };
}
function check(table, score, first) {
  cases++;
  const got = game_(table, score, first), want = insertScore(table, score, first);
  if (want.asked) want.table[want.at].name = NAME.join(',');
  const a = JSON.stringify(got), b = JSON.stringify({ asked: want.asked, table: want.table });
  if (a !== b) fail(`entry ${first + 1} first, score ${score.toString(16)}:\n game ${a}\n port ${b}`);
}
for (const first of [7, 6]) for (let n = 0; n < 10000; n++) check(START, BCD(n), first);
let s = 1985;
const rnd = (k) => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) % k; };
for (let t = 0; t < 200; t++) {
  const scores = Array.from({ length: 8 }, () => rnd(10000)).sort((a, b) => b - a);
  const table = scores.map((v, i) => ({ name: START[i].name, score: BCD(v) })).concat([{ name: START[8].name, score: BCD(rnd(10000)) }]);
  for (let k = 0; k < 2000; k++) for (const first of [7, 6]) check(table, BCD(rnd(10000)), first);
}
console.log(`${cases} cases, ${bad ? bad + ' differ' : 'every table and every name asked for matches'}`);
process.exit(bad ? 1 : 0);
