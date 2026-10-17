#!/usr/bin/env node
// Hold the Levels page's level builder against the game's own code. levels.html's gl-build block
// runs level_build ($C625) and grid_draw ($CBC2) on the kit's 6502 simulator as the page loads it
// (C64Cpu); this runs them on the simulator directly, over the committed listing, with each of
// the page's 128 level files at $0A00, and compares the tile grid ($0C00-$0FFF), the colour and
// character maps ($2000-$3FFF), the three maze fonts' wall glyphs ($4808, $5008, $5808) and the
// tile colours ($F600-$F7FF).
// Everything it needs is committed.
//   node games/c64/gauntlet/test_levels.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'levels.html';
g.lib('cpu6502');
const { buildLevel } = g.run(page, 'gl-build', 'buildLevel');
const html = g.read(page);
const lm = html.match(/const LEVELS = (\[.*?\]);/);
if (!lm) { console.error('no LEVELS data'); process.exit(1); }
const files = JSON.parse(lm[1]).map((s) => Uint8Array.from(Buffer.from(s, 'base64')));
const L = g.listing();
const RANGES = [[0x0C00, 0x1000], [0x2000, 0x4000], [0x4808, 0x4868], [0x5008, 0x5068], [0x5808, 0x5868], [0xF600, 0xF800]];
let bad = 0, monsters = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
if (files.length !== 128) fail('expected 128 level files, the page has', files.length);
files.forEach((f, i) => {
  const page = buildLevel(L.ram.slice(), f);
  const m = L.ram.slice();
  for (let j = 0; j < 0x200; j++) m[0x0A00 + j] = j < f.length ? f[j] : 0;
  const io = { read(a) { if (a === 0xDC04) return 0x55; throw new Error('read $' + a.toString(16)); },
               write(a) { throw new Error('write $' + a.toString(16)); } };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  cpu.call(0xC625, {}); cpu.call(0xCC60, {}); cpu.call(0xCBC2, {}); cpu.call(0xC00E, {});
  for (const [lo, hi] of RANGES) for (let a = lo; a < hi; a++)
    if (m[a] !== page[a]) { fail('file', i + 1, '$' + a.toString(16), 'game', m[a], 'page', page[a]); break; }
  for (let t = 0x0C00; t < 0x1000; t++) {}
  monsters += (m[0x824E] + 1) & 255;
});
console.log(`128 level files, ${monsters} monsters placed, ${bad ? bad + ' differ' : 'every byte matches'}`);
process.exit(bad ? 1 : 0);
