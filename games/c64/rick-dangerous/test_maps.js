#!/usr/bin/env node
// Hold the Maps tab's decoding of the level maps (decodeRow in levels.html) against the game's own
// decoder, decode_row ($2D55, which runs $2D59 into the staging buffer $0400-$047F), in the kit's
// 6502 simulator over the committed listing: every map row of every level, all 128 tile codes.
// Needs no snapshot and no emulator. Exits 1 on any difference.
//   node games/c64/rick-dangerous/test_maps.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname);
const { decodeRow, levels } = g.run('levels.html', 'rd-maps', 'decodeRow', 'levels');
const ram = g.listing().ram;
let bad = 0, rows = 0;
for (const lv of levels(ram)) {
  for (let row = lv.from; row < lv.to; row += 8) {
    const m = Uint8Array.from(ram);
    m[0x1A] = row & 0xFF; m[0x1B] = row >> 8;
    new CPU(m, { port: { dir: 0x2F, data: 0x35 } }).call(0x2D55, {});
    const game = Array.from(m.slice(0x0400, 0x0480)), page = Array.from(decodeRow(ram, row));
    if (game.join() !== page.join() && bad++ < 5) console.log('DIFFERS at map row $' + row.toString(16));
    rows++;
  }
}
console.log(`${rows} map rows of 4 levels: ${bad ? bad + ' differ' : 'every tile code matches'}`);
process.exit(bad || rows < 100 ? 1 : 0);
