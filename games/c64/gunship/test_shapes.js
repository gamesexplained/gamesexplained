#!/usr/bin/env node
// Hold the page's shape viewer (index.html, gs-shapes) to the flight's listing. gsShape reads a
// shape's record from its first byte; for every shape the listing labels between $1EC9 and $2FF0,
// the record gsShape reads must end exactly where the listing's next labelled record begins, or
// one byte before it when that byte is a name (1 to 19), its edges must
// name only points the shape lists, and gsPoints must give every point a shape names. It exits 1
// on any failure.
//   node games/c64/gunship/test_shapes.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { gsShape, gsPoints } = g.run(page, 'gs-shapes', 'gsShape', 'gsPoints');
const L = g.listing('parts/flight/listing.json');
const starts = L.listing.index.map((e) => e.a).sort((a, b) => a - b);   // the labelled records
const pts = gsPoints(L.ram);
let bad = 0, n = 0;
const fail = (...w) => { if (bad++ < 10) console.log('FAILS', ...w); };
for (const [a, l] of L.names) {
  if (a < 0x1EC9 || a > 0x2FF0 || !/^(shape|hill|box|pad|outline|line|strokes|dots|zigzag)/.test(l)) continue;
  const s = gsShape(L.ram, a); n++;
  const next = starts.find((x) => x > a);
  const named = L.ram[s.end] >= 1 && L.ram[s.end] <= 19 && next === s.end + 1;   // a name byte after it
  const last = a === 0x2FF0 && s.end === 0x3054;   // the Hind, the file's last shape, ends where W3's bytes end
  if (s.end !== next && !named && !last) fail(l, 'ends at $' + s.end.toString(16), 'where the next record is $' + next.toString(16));
  for (const [p, q] of s.edges) if (p >= s.points.length || q >= s.points.length) fail(l, 'an edge names point', p, q);
  for (const i of s.points) if (a !== 0x2FF0 && i >= pts.length) fail(l, 'names point', i, 'of', pts.length);
}
if (n < 59) fail('only', n, 'shapes found');
console.log(`${n} shapes, ${pts.length} points: ` + (bad ? bad + ' failures' : 'every record ends where the listing\'s next one starts'));
process.exit(bad ? 1 : 0);
