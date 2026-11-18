'use strict';
// Holds levels.html's map, the road built by the game's own draw_map_row ($7F80) on the kit's 6502
// over the listing (ikariRoute), and the rows where the map script sends a helicopter
// (ikariHelicopters). The rows were checked once against a Python copy of draw_map_row, which gave
// the same 1,891 rows, and against the 49 rows the game had drawn in a saved moment of play in VICE
// (facts.md, "Live tests"); this test holds the page to what those checks saw: the row count, the
// tile-set loads, the helicopters, and a hash of every row's characters and colours.
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { ikariRoute } = g.run('levels.html', 'ikari-route', 'ikariRoute');
const { ikariHelicopters } = g.run('levels.html', 'ikari-helicopters', 'ikariHelicopters');
const ram = g.listing().ram;
const R = ikariRoute(ram.slice(), kit), H = ikariHelicopters(ram.slice(), kit);
const h = crypto.createHash('sha256');
for (const r of R.rows) { h.update(Buffer.from(r.ch)); h.update(Buffer.from(Array.from(r.co, v => v & 15))); }
const got = { rows: R.rows.length, tiles: R.marks.filter(m => m[1] === 'TILES').length, helicopters: H.length, hash: h.digest('hex').slice(0, 16) };
const want = { rows: 1891, tiles: 26, helicopters: 21, hash: '783064ea38d7507f' };
let bad = 0;
for (const k of Object.keys(want)) if (String(got[k]) !== String(want[k])) { console.log(`${k}: want ${want[k]}, got ${got[k]}`); bad++; }
console.log(bad ? 'the map differs' : `${got.rows} rows, ${got.tiles} tile sets and ${got.helicopters} helicopters, as checked`);
process.exit(bad ? 1 : 0);
