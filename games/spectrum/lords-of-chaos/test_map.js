'use strict';
// The map window the pages draw (the block loc-map, in index.html and levels.html) against the
// game's own draw_map ($A94C) run on the kit's Z80 from the committed listings: for each scenario,
// 288 windows (every origin row, every fifth column, wrapping at 36), the cursor off, the screen's
// 21 x 21 character cells compared byte for byte, pixels and attributes.
//   node games/spectrum/lords-of-chaos/test_map.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
g.sameBlock('loc-map');
const { LOCMap } = g.run('index.html', 'loc-map', 'LOCMap');

let fails = 0, cases = 0;
const cells = [];
for (let r = 0; r < 21; r++) for (let c = 0; c < 21; c++) {
  for (let k = 0; k < 8; k++) cells.push(0x4000 + ((r & 0x18) << 8) + ((r & 7) << 5) + (k << 8) + c);
  cells.push(0x5800 + 32 * r + c);
}
for (const n of [1, 2, 3]) {
  const base = memory(n);
  base[0xD0D0] = 0;                        // the cursor off
  base[0xC839] = 0;                        // no sound running
  for (let r0 = 0; r0 < 36; r0++) for (let c0 = 0; c0 < 36; c0 += 5) {
    const G = base.slice(), P = base.slice();
    G[0xD0C8] = r0; G[0xD0C9] = c0;
    call(G, 0xA94C);
    LOCMap.window(P, r0, c0);
    cases++;
    const bad = cells.find(a => G[a] !== P[a]);
    if (bad !== undefined && fails++ < 5)
      console.log(`FAIL scenario ${n}, window at row ${r0}, column ${c0}: $${bad.toString(16)} game ${G[bad]} page ${P[bad]}`);
  }
}
console.log(fails ? `FAIL: ${fails} of ${cases} windows differ` : `ok - ${cases} map windows drawn as the game draws them, three scenarios`);
process.exit(fails ? 1 : 0);
