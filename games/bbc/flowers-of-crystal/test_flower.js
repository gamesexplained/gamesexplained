#!/usr/bin/env node
// Hold the Crystal Flower and the map on the How it works tab against the game. The page's ports
// draw each from Part 2's and Part 1's committed listings, and each screen must be the one jsbeeb
// showed on 24 October 2026, given here as the first 16 hex digits of the SHA-256 of its bytes, so
// that no screen of the game is committed. The flower: each routine's bytes sent alone to a cleared
// MODE 7 screen (letters F, L, O, W, E and R), all six one after another, and the two screens BASIC
// builds round them, the last flower (all six parts, FN set) and the third dream (L and W held). The
// map: the 17 rows of the window as PROCmap opens it, after each of 28 presses of the up arrow and
// after 3 of the down arrow. The three pages must carry the same ports block.
//   node games/bbc/flowers-of-crystal/test_flower.js
const path = require('path'), crypto = require('crypto'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.sameBlock('ports');
const P = g.run('index.html', 'ports', 'screen7', 'vdu7', 'FLOWER', 'flowerBytes', 'flowerScreen', 'mapRows', 'mapOpen', 'mapUp', 'mapDown');

const LETTERS = { F: '5d4a26c0c4c8223c', L: '0cc5e8bc7bede14c', O: 'fb788f98b27ac60a', W: '6dfdca8da879c858',
  E: '2b2bb30a0de2e28d', R: '850bc66ee9aa1c47', all: 'b9ead485733835e2' };
const SCREENS = [['last', 'FLOWER', 4, true, 'f0192e578604f20c'], ['dream3', 'LW', 3, false, '47f3f6a04b41c499']];
const MAP = ['bed6493834a1ecb8', '5adb574980fed258', '0a81e735ff3c985e', '618c62e55a9a0cbb', '3e6d9340aef9a78c',
  '33d0e71a92e3b1e1', '8c7a14722ad9a66c', 'd5a7d3370686655c', '6788d5552ccd3f62', 'd7f93046be3cb32b', 'b3d31be1dadb4e22',
  '94573132ec253f84', '6c99cc10ce4daf9d', 'a099b40369e7af20', '5b35659876fd09ed', '4faf4e0345e3c0d3', '8604134ea1ff5405',
  '38974b3c6451ebe3', '6f7c55d4a331402d', 'f455d16ee123809c', '977046e63f37b6b6', '9e1b85638b23a72c', 'ad5a22abe85edea9',
  'ad954e0dcc0a078a', '3a1660c5b494198c', '5c084b9f156b1f04', '697f87f4d3b297ed', '697f87f4d3b297ed', '697f87f4d3b297ed',
  '4ba633549ceb8723', 'e0b57717b0720b8f', 'b75bf17bf160baab'];
const hash = (s, n) => crypto.createHash('sha256').update(Buffer.from(s.subarray(0, n))).digest('hex').slice(0, 16);

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('FLOWER', ...what); };
const A2 = g.listing('parts/adventure-2/listing.json'), A1 = g.listing('parts/adventure-1/listing.json');
const all = P.screen7(); P.vdu7(all, [26, 12]);
for (const k of 'FLOWER') {
  const t = P.screen7(), b = P.flowerBytes(A2.ram, A2.sym(P.FLOWER[k]));
  P.vdu7(t, [26, 12]); P.vdu7(t, b); P.vdu7(all, b);
  if (hash(t.s, 1000) !== LETTERS[k]) fail(`${k} alone: the screen differs from the game's`);
}
if (hash(all.s, 1000) !== LETTERS.all) fail('all six: the screen differs from the game\'s');
for (const [k, held, n, fn, want] of SCREENS) {
  if (hash(P.flowerScreen(A2.ram, A2.sym, held, n, fn), 1000) !== want) fail(`${k}: the screen differs from the game's`);
}
const rows = P.mapRows(A1.ram, A1.sym('map_north'));
if (rows.length !== 42) fail(`the map has ${rows.length} rows, the game 42`);
const t = P.mapOpen(rows), seen = [hash(t.s, 680)];
for (let i = 0; i < 28; i++) { P.mapUp(t, rows); seen.push(hash(t.s, 680)); }
for (let i = 0; i < 3; i++) { P.mapDown(t, rows); seen.push(hash(t.s, 680)); }
seen.forEach((h, i) => { if (h !== MAP[i]) fail(`map screen ${i}: differs from the game's`); });
console.log(`flower: ${Object.keys(LETTERS).length + SCREENS.length} screens; map: ${MAP.length} screens`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
