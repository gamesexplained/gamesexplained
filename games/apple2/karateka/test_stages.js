#!/usr/bin/env node
// The Maps / levels tab, reference/stages.js: each stage run from the listings on the kit's 6502
// from its entry, with the engine's memory as the stage before it left it. At every place the tab
// shows, the page shown holds the same picture, byte for byte, as Apple2TS showed when run from the
// stage's snapshot at $BFFA, stopped at the same six places at the same flip after the same changes
// (work/verify/stages_live.py, 24 October 2026). The picture is the 7,680 bytes of the page the
// screen shows, row by row; the pictures are game memory, so this file keeps only their SHA-256.
//   node games/apple2/karateka/test_stages.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502'); g.lib('apple2');
const { KarStages } = g.run('reference/stages.js', 'stages.js', 'KarStages');
const LIVE = {                         // part/place: [flip, page shown, SHA-256 of the picture], from Apple2TS
  'cliff/0': [2, 1, '734e46fb3d077bd3'], 'cliff/1': [8, 1, 'b46c0d77241ae2e5'],
  'cliff/2': [22, 1, '551e71591ee04b1a'], 'cliff/3': [12, 1, '7ce432afc186061a'],
  'palace/0': [1, 2, 'd85efef43c83b3d9'], 'palace/1': [3, 2, 'f9614954ec21fe1a'],
  'palace/2': [5, 2, 'd213404ad2753b7e'], 'palace/3': [5, 2, '8f1ebe0db85f7693'],
  'dungeon/0': [7, 2, '608825dbc2150f37'], 'dungeon/1': [10, 1, 'f9a01abc34e7725f'],
  'dungeon/2': [13, 2, 'ae69b8859bb75169'], 'dungeon/3': [16, 1, '84a68d3f2c87c691'],
  'dungeon/4': [19, 2, '1f29dbcd3ce4a4d4'],
  'akuma/0': [1, 2, '37f315f00acee91e'], 'akuma/1': [5, 2, 'b9fe858644bad453'],
  'akuma/2': [8, 1, 'e063b9a758cc2019'], 'akuma/3': [2, 1, 'f83c074aa9efa4eb'],
};
const Ls = {};
for (const p of ['engine', 'cliff', 'palace', 'dungeon', 'akuma']) Ls[p] = g.listing(`parts/${p}/listing.json`);
let bad = 0, n = 0;
for (const S of KarStages.STAGES) S.places.forEach((P, k) => {
  const id = `${S.part}/${k}`, want = LIVE[id];
  if (!want) { bad++; console.log(`FAIL ${id} (${P.name}): no picture from Apple2TS for it`); return; }
  const s = KarStages.place(Ls, S.part, k), off = s.page === 2 ? 0x2000 : 0;
  const shown = new Uint8Array(192 * 40);
  for (let y = 0; y < 192; y++) shown.set(s.m.subarray(Apple2.hiresBase(y) + off, Apple2.hiresBase(y) + off + 40), y * 40);
  const hash = crypto.createHash('sha256').update(shown).digest('hex').slice(0, 16);
  n++;
  if (s.flips !== want[0] || s.page !== want[1] || hash !== want[2]) {
    bad++;
    console.log(`FAIL ${id} (${P.name}): flip ${s.flips}, page ${s.page}, picture ${hash}; Apple2TS: flip ${want[0]}, page ${want[1]}, picture ${want[2]}`);
  }
});
if (n !== Object.keys(LIVE).length) { bad++; console.log(`FAIL ${n} places, ${Object.keys(LIVE).length} pictures from Apple2TS`); }
if (bad) process.exit(1);
console.log(`test_stages: all ${n} places of the four stages show the picture Apple2TS showed`);
