#!/usr/bin/env node
// Hold the page's map reader (the gr-map block of levels.html and index.html) against the game's
// own column drawers. For every stage that turns its scenery on, and every column of map it
// scrolls through (grScenery), the game's map_column ($4EA9), or map_column_up ($54DF) on stage
// 4, runs on the kit's 6502 over the listing's memory with map_ptr ($4E7F/$4E80) at the column;
// the 19 cells it writes at the right edge of rows 3 to 21 (column_lo/column_hi, $4E81/$4E95) and
// how far it moves map_ptr must equal what grColumn reads. Both pages' copies of the block must be
// the same. It exits 1 on any difference.
//   node games/c64/gradius/test_map.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.sameBlock('gr-map');
const B = g.run('levels.html', 'gr-map', 'grStage', 'grScenery', 'grColumn');
const L = g.listing();
let bad = 0, cols = 0;
const out = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (let s = 0; s < 8; s++) {
  const st = B.grStage(L.ram, s), sc = B.grScenery(L.ram, s);
  if (!sc) { out.push(`stage ${s + 1} none`); continue; }
  const m = L.ram.slice();
  const cpu = new CPU(m, { port: 0x35, io: { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } } });
  let p = st.map;
  for (let c = 0; c < sc.columns; c++) {
    const page = B.grColumn(L.ram, p, st.up);
    m[0x4E7F] = p & 255; m[0x4E80] = p >> 8;
    cpu.call(st.up ? 0x54DF : 0x4EA9, {}, { maxSteps: 100000 });
    const game = [];
    for (let r = 0; r < 19; r++) game.push(m[m[0x4E81 + r] | m[0x4E95 + r] << 8]);
    const q = m[0x4E7F] | m[0x4E80] << 8;
    if (game.join() !== page.rows.join()) fail(`stage ${s + 1} column ${c}`, game.join(), '|', page.rows.join());
    if (q - p !== page.read) fail(`stage ${s + 1} column ${c} read`, q - p, page.read);
    p = q; cols++;
  }
  out.push(`stage ${s + 1} ${sc.columns}`);
}
console.log(`${cols} columns: ` + (bad ? bad + ' differences' : 'every column matches the game\'s drawer; ' + out.join(', ')));
process.exit(bad ? 1 : 0);
