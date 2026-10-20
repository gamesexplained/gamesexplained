#!/usr/bin/env node
// The page's first look inside, reference/demo.js: the attract mode run from the listing on the
// kit's 6502. Each frame it stops at holds the same two hi-res pages, byte for byte, as Apple2TS held
// at the same call of gfx_show_page ($12E3), run as an Apple II Plus from the loader's hand-over
// (work/verify/frames_live.py, 20 October 2026). The pages are game memory, so this file keeps
// only their SHA-256 and the page each frame showed.
//   node games/apple2/choplifter/test_demo.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { ChopDemo } = g.run('reference/demo.js', 'demo.js', 'ChopDemo');
const LIVE = {                         // frame: [page shown, SHA-256 of $2000-$5FFF], from Apple2TS
  1: [2, '7074feb4f9814ca4'], 2: [1, '3756a8413e945760'], 40: [2, '8814e9d5dc21b6a0'],
  200: [2, 'efe7c9a28d8b32fe'], 400: [2, '7f4b4b2daf9a92f7'], 800: [2, 'a5a6e7a8cb0dcd34'],
};
let bad = 0;
const s = ChopDemo.start(g.listing());
const last = Math.max(...Object.keys(LIVE).map(Number));
for (let f = 1; f <= last; f++) {
  const { page } = ChopDemo.next(s);
  if (!LIVE[f]) continue;
  const hash = crypto.createHash('sha256').update(s.m.subarray(0x2000, 0x6000)).digest('hex').slice(0, 16);
  if (page !== LIVE[f][0] || hash !== LIVE[f][1]) {
    bad++;
    console.log(`FAIL frame ${f}: page ${page}, pages ${hash}; Apple2TS showed page ${LIVE[f][0]}, pages ${LIVE[f][1]}`);
  }
}
if (bad) process.exit(1);
console.log(`test_demo: frames ${Object.keys(LIVE).join(', ')} of the attract mode match Apple2TS byte for byte`);
