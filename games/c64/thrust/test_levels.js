#!/usr/bin/env node
// The Levels tab's ports (levels.html) against the game's own code, run on the kit's 6502 on the
// committed listing. thrust-walls is the wall generators: for each of the six levels the game's
// reset_walls ($83B4) is run with the camera at eight rows, and every row of the ring it leaves at
// $0400 and $0500 must equal the port's. thrust-doors is move_doors ($917D): on levels 4-6, with
// the door shut, opening and fully open, the rows it writes must equal the port's.
//   node games/c64/thrust/test_levels.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
g.sameBlock('thrust-walls');   // index.html draws level 1 with the same port
const { thrustWalls } = g.run('levels.html', 'thrust-walls', 'thrustWalls');
const { thrustDoor } = g.run('levels.html', 'thrust-doors', 'thrustDoor');
const io = { read: () => 0, write: () => {} };
let bad = 0, rows = 0, doorRows = 0;
for (let level = 0; level < 6; level++) {
  const m = g.listing().ram;
  const cpu = new C64Cpu.CPU(m, { port: 0x36, io });
  // start_level_tables' pointers to the level's wall lists
  for (const [d, lo, hi] of [[0x84C0, 0xA8FD, 0xA903], [0x84C2, 0xA909, 0xA90F], [0x84C4, 0xA915, 0xA91B], [0x84C6, 0xA921, 0xA927]]) {
    m[d] = m[lo + level]; m[d + 1] = m[hi + level];
  }
  const W = thrustWalls(m, level, 0x600);
  for (const cam of [0, 0x40, 0x100, 0x12D, 0x200, 0x2F0, 0x3A0, 0x480]) {
    m[0x03] = cam & 0xFF; m[0x04] = cam >> 8;
    cpu.call(0x83B4);
    for (let r = cam + 1; r < cam + 256; r++, rows++)
      if (m[0x400 + (r & 0xFF)] !== W.left[r] || m[0x500 + (r & 0xFF)] !== W.right[r]) {
        if (bad++ < 5) console.log(`FAIL level ${level + 1}, camera $${cam.toString(16)}, row $${r.toString(16)}: the game's walls ${m[0x400 + (r & 0xFF)]}, ${m[0x500 + (r & 0xFF)]}; the port's ${W.left[r]}, ${W.right[r]}`);
      }
  }
  if (level < 3) continue;
  // move_doors: the camera just above the door's rows, the timer and the opening as each case asks
  const doorRow = [0, 0, 0, 0x269, 0x344, 0x370][level];
  // move_doors counts the timer $6B down first: 0 leaves the door shut, 5 opens it to 4, and $FF
  // with the opening one short of its limit opens it fully
  const limit = [0, 0, 0, 0x10, 0x15, 0x12][level], opened = new Set();
  for (const [timer, open] of [[0, 0], [5, 0], [0xFF, limit - 1]]) {
    m[0xA6A4] = level; m[0x03] = (doorRow - 0x20) & 0xFF; m[0x04] = (doorRow - 0x20) >> 8;
    cpu.call(0x83B4);
    m[0x6B] = timer; m[0x6C] = open;
    cpu.call(0x917D);
    opened.add(m[0x6C]);
    const got = m[0x6C], left = W.left.slice(), lim = thrustDoor(left, level, got);
    if (got > lim) { bad++; console.log(`FAIL level ${level + 1}: the game opened its door to ${got}, past the port's limit ${lim}`); }
    for (let r = doorRow - 2; r < doorRow + 24; r++, doorRows++)
      if (m[0x400 + (r & 0xFF)] !== left[r]) {
        if (bad++ < 10) console.log(`FAIL level ${level + 1} door ${got}, row $${r.toString(16)}: the game's ${m[0x400 + (r & 0xFF)]}, the port's ${left[r]}`);
      }
  }
  if ([0, 4, limit].some(v => !opened.has(v))) { bad++; console.log(`FAIL level ${level + 1}: the door was opened to ${[...opened]}, not shut, to 4 and fully`); }
}
if (bad) { console.log(`test_levels: ${bad} failed`); process.exit(1); }
console.log(`test_levels: the walls of ${rows} rows and ${doorRows} rows round the doors match the game's own code`);
