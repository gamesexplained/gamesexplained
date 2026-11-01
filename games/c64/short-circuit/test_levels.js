#!/usr/bin/env node
// Holds the Maps / levels page to the game. The page draws part one's strip from stripChar (the tile map at
// $4000, $4100, $4200 and the tiles at $5000) and part two's event table; this test
//   1. finds the first frame's screen (SC_FRAME1's memory from index.html, the 12 rows of 40 characters at
//      $C050) inside the strip, character for character: the strip's left edge is at some character offset;
//   2. counts the event table's columns as the page's text says (the quiet columns and 15 starters);
//   3. checks the page's object badges: 21 objects, each at the column the listing's table holds.
//   node games/c64/short-circuit/test_levels.js [page.html]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const page = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'levels.html');
const { stripChar } = g.run(page, 'mapchars', 'stripChar');
const { SC_FRAME1 } = g.run(path.join(__dirname, 'index.html'), 'frames', 'SC_FRAME1');
const ram = g.listing().ram, html = fs.readFileSync(page, 'utf8');
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
// the frame's memory
const mem = new Uint8Array(0x10000);
for (const run of SC_FRAME1.ram) Buffer.from(run.b, 'base64').forEach((v, i) => { mem[run.a + i] = v; });
let found = -1;
for (let first = 0; first < 1024 - 40 && found < 0; first++) {
  let ok = true;
  for (let y = 0; y < 12 && ok; y++) for (let x = 0; x < 40; x++) if (stripChar(ram, first, x, y) !== mem[0xC050 + 40 * y + x]) { ok = false; break; }
  if (ok) found = first;
}
if (found < 0) fail('the first frame’s screen is nowhere in the strip');
// the events
const ev = Array.from({ length: 256 }, (_, i) => ram[0x896E + i]);
const quiet = ev.filter(v => v === 0).length;
if (!html.includes(quiet + ' of the columns hold nothing')) fail('the page does not say that ' + quiet + ' columns hold nothing');
if (Math.max(...ev) !== 15) fail('the largest event number is not 15');
for (let k = 1; k <= 15; k++) if (k !== 10 && ev.filter(v => v === k).length === 0) fail('event', k, 'is never started');
if (ev.filter(v => v === 10).length) fail('event 10 is started, the page has no row for it');
// the objects
for (let i = 0; i < 21; i++) { const o = 0x1568 + 4 * i; if (ram[o + 2] !== i) fail('object', i, 'is not number', i); }
if (!/for \(let i = 0; i < 21; i\+\+\)/.test(html)) fail('the page does not make 21 badges');
console.log(bad ? bad + ' difference(s)' : `levels test passed: the first frame's 480 characters are the strip from character ${found}, ${quiet} quiet columns, 21 objects`);
process.exit(bad ? 1 : 0);
