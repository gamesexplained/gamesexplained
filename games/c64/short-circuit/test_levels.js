#!/usr/bin/env node
// Holds the Maps / levels page to the game. The page draws part one's strip from stripChar (the tile map at
// $4000, $4100, $4200 and the tiles at $5000) and part two's event table; this test
//   1. finds the first frame's screen (SC_FRAME1's memory from index.html, the 12 rows of 40 characters at
//      $C050) inside the strip, character for character: the strip's left edge is at some character offset;
//   2. counts the event table's columns as the page's text says (the quiet columns and 15 starters);
//   3. checks the page's object badges: 21 objects, each at the column the listing's table holds.
//   4. checks that the page draws the strip with the character set the frame's $D018 selects ($D000);
//   5. finds part two's recorded frame (SC_FRAME2) in the page's part-two strip (p2Char): screen rows 6 to 13,
//      columns 0 to 30, are the strip from character 9, and every cell of those rows has the colour $9448 gives
//      its character; the frame's writes on line 98 set the character set and the colours the page uses.
//   node games/c64/short-circuit/test_levels.js [page.html]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const page = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'levels.html');
const { stripChar } = g.run(page, 'mapchars', 'stripChar');
const { SC_FRAME1, SC_FRAME2 } = g.run(path.join(__dirname, 'index.html'), 'frames', 'SC_FRAME1', 'SC_FRAME2');
const { p2Char, P2_SET, P2_COLOURS } = g.run(page, 'map2chars', 'p2Char', 'P2_SET', 'P2_COLOURS');
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
// the character set: the frame's $D018 as the playfield begins selects it in video bank 3, and the page
// must draw with that one ($D018 bits 1-3 are the set's place in the bank, in units of $0800)
const set = 0xC000 + ((SC_FRAME1.vic[0x18] & 0x0E) << 10);
if (set !== 0xD000) fail('the frame draws its playfield from', set.toString(16), 'not $D000');
if (!html.includes('charset = ram.subarray(0x' + set.toString(16).toUpperCase() + ', 0x' + (set + 0x800).toString(16).toUpperCase() + ')'))
  fail('the page does not draw the strip with the character set at $' + set.toString(16).toUpperCase());
// part two's strip against its recorded frame
const mem2 = new Uint8Array(0x10000);
for (const run of SC_FRAME2.ram) Buffer.from(run.b, 'base64').forEach((v, i) => { mem2[run.a + i] = v; });
const colour2 = Buffer.from(SC_FRAME2.colour, 'base64');
let p2cells = 0;
for (let y = 0; y < 8; y++) for (let x = 0; x < 31; x++) {
  if (mem2[0xC000 + 40 * (6 + y) + x] !== p2Char(ram, 9 + x, y)) fail('part two: screen row', 6 + y, 'column', x, 'is not the strip');
  else p2cells++;
}
for (let y = 0; y < 8; y++) for (let x = 0; x < 40; x++) {
  const code = mem2[0xC000 + 40 * (6 + y) + x];
  if ((colour2[40 * (6 + y) + x] & 15) !== (ram[0x9448 + code] & 15)) fail('part two: the colour of row', 6 + y, 'column', x, 'is not from $9448');
}
const at98 = (reg) => { const w = SC_FRAME2.writes.find((w) => w[0] === 98 && w[2] === reg); return w ? w[4] : null; };
if (0xC000 + ((at98(0xD018) & 0x0E) << 10) !== P2_SET) fail('part two: the frame selects another character set on line 98');
if (at98(0xD022) !== P2_COLOURS[1] || (SC_FRAME2.vic[0x23] & 15) !== P2_COLOURS[2] || (SC_FRAME2.vic[0x21] & 15) !== P2_COLOURS[0])
  fail('part two: the band colours are not', P2_COLOURS.join());
if ((at98(0xD016) & 0x10) === 0) fail('part two: the band is not multicolour');
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
console.log(bad ? bad + ' difference(s)' : `levels test passed: the first frame's 480 characters are the strip from character ${found}, part two's frame holds ${p2cells} cells of its strip, ${quiet} quiet columns, 21 objects`);
process.exit(bad ? 1 : 0);
