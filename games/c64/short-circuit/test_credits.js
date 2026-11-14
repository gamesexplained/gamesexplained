#!/usr/bin/env node
// Hold graphics.html's credits screen (the block sc-credits) to the game. The page draws one frame
// recorded in VICE (vice-mcp 3.13.2, 13 November 2026) from the cassette's hand-over snapshot run
// 2.5 seconds into the attract mode; drawn by site/lib/c64.js it matched VICE's own picture in all
// 104,448 pixels (kit/c64/frame.py compare). This checks what the page says about it:
// - the memory the frame carries is the listing's: the screen at $8000 and the character shapes at
//   $8C00 (characters $80-$F1 of the set at $8800), byte for byte;
// - it is multicolour text in video bank 2 ($DD00 $95, $D018 $02 as $9637 sets them, $D016 $18 read
//   back as $D8), background $D021 light blue (14) and $D022 black, and character $F1, which fills
//   every empty cell, is eight bytes of $55: all first shared colour;
// - the raster interrupt writes $D023 on 24 lines from 93 to 145, nothing else of the chip's.
// It exits 1 on any difference.
//   node games/c64/short-circuit/test_credits.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { SC_CREDITS: F } = g.run('graphics.html', 'sc-credits', 'SC_CREDITS');
const ram = g.listing().ram;
let bad = 0;
const check = (what, got, want) => { if (String(got) !== String(want)) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

for (const run of F.ram) {
  const b = Buffer.from(run.b, 'base64');
  if (run.a >= 0xC000) continue;                       // the one byte of the stack the frame read
  let wrong = 0; for (let i = 0; i < b.length; i++) if (b[i] !== ram[run.a + i]) wrong++;
  check(`frame memory at $${run.a.toString(16)} (${b.length} bytes) against the listing`, wrong, 0);
}
check('the screen is in the frame', F.ram.some((r) => r.a === 0x8000), true);
check('$DD00', F.cia2[0] & 0x97, 0x95);
check('$D018 as $9637 stores it', ram[0x9638], 0x02);
check('$D016 multicolour', (F.vic[0x16] & 0x10) !== 0, true);
check('$D021, $D022', [F.vic[0x21] & 15, F.vic[0x22] & 15].join(), '14,0');
check('character $F1', Buffer.from(ram.subarray(0x8800 + 0xF1 * 8, 0x8800 + 0xF1 * 8 + 8)).toString('hex'), '5555555555555555');
const bands = F.writes.filter((w) => w[2] === 0xD023);
check('writes to $D023', bands.length, 24);
check('first and last band line', [bands[0][0], bands[bands.length - 1][0]].join(), '93,145');
check('no other chip writes', F.writes.filter((w) => w[2] >= 0xD000 && w[2] < 0xE000 && w[2] !== 0xD023).length, 0);

console.log(bad ? bad + ' difference(s)' : "short-circuit credits: the page's frame is the listing's screen and font, striped by 24 writes to $D023");
process.exit(bad ? 1 : 0);
