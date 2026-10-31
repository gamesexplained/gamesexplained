#!/usr/bin/env node
// Hold the page's port of the battle's unpacker (index.html's ns-field block, nsField) against the
// game's own field_unpack, entered at $90C5 with A = the field and $826D set to it as $90A5 sets
// it, run on the kit's simulator over the battle part's listing, for all three fields. The bitmap
// it leaves at $4000-$5F3F, the screen at $6000-$63E7 and the colours it writes to $D800-$DBE7 must
// equal the port's, byte for byte. It exits 1 on any difference.
//   node games/c64/north-and-south/test_fields.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { nsField } = g.run(page, 'ns-field', 'nsField');
const L = g.listing('parts/battle/listing.json').ram;
let bad = 0;
for (let t = 0; t < 3; t++) {
  const m = L.slice(), col = new Uint8Array(1024).fill(0xFF);
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) { col[a - 0xD800] = v & 15; return; } throw new Error('write $' + a.toString(16)); },
  };
  m[0x826D] = t;
  new CPU(m, { port: 0x35, io }).call(0x90C5, { a: t, x: 0, y: 0 });
  const f = nsField(L, t);
  const check = (what, got, want) => {
    for (let i = 0; i < want.length; i++) if (got[i] !== want[i]) { bad++; console.log(`DIFFERS field ${t} ${what} byte ${i}: page ${got[i]}, game ${want[i]}`); return; }
  };
  check('bitmap', f.bitmap, m.subarray(0x4000, 0x4000 + 8000));
  check('screen', f.screen, m.subarray(0x6000, 0x6000 + 1000));
  check('colours', f.colour.map((v) => v & 15), col.subarray(0, 1000));
}
console.log('3 fields: ' + (bad ? bad + ' differences' : 'the port unpacks each as the game does'));
process.exit(bad ? 1 : 0);
