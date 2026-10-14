#!/usr/bin/env node
// Hold the magic trees and the map's roads on the How it works tab against the game. The tree the page
// prints from the 59 values of Part 1's DATA (line 2330, read from the committed listing with the
// page's treeString and vduPrint) must be the tree on the screen jsbeeb showed (SCREENS.trees), at each
// of the twelve places line 280 prints it, TAB(7, 16, 25 or 34, 0, 6 or 12). magicTree must give six
// trees for the six rolls of RND(3) and RND(2), b-d in rows 2 and 1, and a1 after T. road must give
// the sums and meetings of PROCw's table in parts/part-2/facts.md.
//   node games/bbc/grannys-garden/test_trees.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { treeString, vduPrint, magicTree, road } = g.run('index.html', 'ports', 'treeString', 'vduPrint', 'magicTree', 'road');
const { SCREENS } = g.run('index.html', 'data', 'SCREENS');

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('TREES', ...what); };
const P = g.listing('parts/part-1/listing.json');
const tree = treeString(P.ram, P.sym('tree_data')).map(t => t.code);
if (tree.length !== 59) fail(`${tree.length} values`);
const shown = Buffer.from(SCREENS.trees, 'base64');
for (const h of [7, 16, 25, 34]) for (const v of [0, 6, 12]) {
  const scr = new Uint8Array(1000).fill(32);
  vduPrint(scr, h, v, tree);
  for (let i = 0; i < 1000; i++) if (scr[i] !== 32 && scr[i] !== shown[i]) { fail(`the tree at TAB(${h},${v}): row ${Math.floor(i / 40)}, column ${i % 40} is ${scr[i]}, the screen ${shown[i]}`); break; }
}
const seen = new Set();
for (const a of [1, 2, 3]) for (const b of [1, 2]) { seen.add(magicTree(n => (n === 3 ? a : b), false).name); }
if ([...seen].sort().join() !== 'b1,b2,c1,c2,d1,d2') fail(`the trees that can be magic: ${[...seen].sort().join()}`);
if (magicTree(() => 1, true).name !== 'a1') fail('T does not give a1');

const MEET = { 4: 'the dwarf', 5: 'the Witch', 8: 'the troll', 9: 'the beast', 3: '', 7: '' };
for (let a = 1; a <= 5; a++) for (let b = 1; b <= 5; b++) {
  const r = road(a, b);
  if (a === b || a + b === 6) {
    if (/already/.test(r.refused || '') !== (a === b) || /straight/.test(r.refused || '') !== (a + b === 6)) fail(`${a} to ${b}: ${r.refused}`);
    continue;
  }
  if (r.meet !== MEET[a + b]) fail(`${a} to ${b}: meets ${r.meet}, facts.md ${MEET[a + b]}`);
}
for (let b = 1; b <= 5; b++) if (!!road(10, b).refused !== (b > 2)) fail(`from the start to ${b}`);
console.log(`trees: the tree checked at 12 places on the screen; ${seen.size} magic trees; roads checked`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
