#!/usr/bin/env node
// Hold the pages' map drawing against the game's own code. The gb-stage block, which index.html
// and levels.html share, builds each stage's memory (gbStageMem), each map column's characters and
// colours (gbColumn) and the mines (gbMines). Here the game builds them on the kit's simulator over
// the listing: for stage s, stage_swaps ($15CB) runs with stage set to each of 1 to s, as
// stage_complete runs it on the way, and prison_setup ($3CB7) for the Prison Camp; the two
// memories must then be the same everywhere. Then column_draw ($39FB) runs for every map column,
// $0000-$0917, on each stage's memory, with its 16 row pointers and their colour twins aimed at a
// buffer, and the stage's mine table (mines_place, the end of column_draw) read for the stage:
// what it writes must be what gbColumn gives, with the mine gbMines puts in that column on row 23.
// The last column, $0918, is left out: its tiles ($C5 and $CE) lie past $D000, so the game reads
// them from the chips' registers there, into a column the narrowed screen hides, and the pages
// draw the map up to $0917.
// It exits 1 on any difference.
//   node games/c64/green-beret/test_map.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('gb-stage');
const { gbStageMem, gbColumn, gbMines } = g.run(page, 'gb-stage', 'gbStageMem', 'gbColumn', 'gbMines');
const L = g.listing();
const CH = 0x0400, CO = 0x0420;            // where the test aims column_draw's pointers
let bad = 0, cols = 0, mines = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
for (let s = 0; s < 4; s++) {
  const m = L.ram.slice(), cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  for (let st = 1; st <= s; st++) { m[0x03B1] = st; cpu.call(0x15CB, {}); }
  if (s === 3) cpu.call(0x3CB7, {});
  m[0x03B1] = s;
  const page = gbStageMem(L.ram, s);
  // the swaps and prison_setup; aside are the play variables play_reset clears, the swap flags
  // ($3FF0) and the two operands block_swap writes into itself ($FF22, $FF56)
  const at = differ(m, page, [[0x0400, 0x3FEF], [0x4000, 0xFF21], [0xFF23, 0xFF55], [0xFF57, 0xFFFF]]);
  if (at >= 0) fail('stage', s, 'memory at $' + at.toString(16), 'game', m[at], 'page', page[at]);
  const mine = new Map(gbMines(page, s));
  for (let col = 0; col <= 0x0917; col++) {
    for (let i = 0; i < 16; i++) { m[0xA0 + 2 * i] = (CH + i) & 0xFF; m[0xA1 + 2 * i] = (CH + i) >> 8; m[0xC0 + 2 * i] = (CO + i) & 0xFF; m[0xC1 + 2 * i] = (CO + i) >> 8; }
    for (let i = 0; i < 32; i++) m[CH + i] = 0xEE;
    const prev = (col - 1) & 0xFFFF;
    m[0x1B] = prev & 0xFF; m[0x1C] = prev >> 8; m[0x0335] = 1;
    cpu.call(0x39FB, {});
    const want = gbColumn(page, col);
    if (mine.has(col)) { want[15] = [mine.get(col), 0x0F]; mines++; }
    for (let i = 0; i < 16; i++)
      if (m[CH + i] !== want[i][0] || m[CO + i] !== want[i][1]) { fail('stage', s, 'column $' + col.toString(16), 'row', 8 + i, 'game', m[CH + i], m[CO + i], 'page', want[i].join()); break; }
    cols++;
  }
}
console.log(`4 stages' memory, ${cols} columns, ${mines} mines: ` + (bad ? bad + ' differences' : 'every character and colour matches the game\'s code'));
process.exit(bad ? 1 : 0);
