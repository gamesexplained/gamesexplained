#!/usr/bin/env node
// The page's first look inside, reference/demo.js: the title and the demo run from the listings on
// the kit's 6502. At each flip it stops at, both hi-res pages hold the same bytes, and the same page
// is shown, as in Apple2TS run from the title stage's snapshot at $BFFA, stopped at the same six
// places at the same flip (work/verify/demo_live.py, 24 October 2026): the credits, the logo, the
// prologue, the scene in Akuma's chamber, the demo fight and the prologue again. The pages are game
// memory, so this file keeps only their SHA-256.
//   node games/apple2/karateka/test_demo.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502'); g.lib('apple2');
const { KarDemo } = g.run('reference/demo.js', 'demo.js', 'KarDemo');
const LIVE = {                         // flip: [page shown, SHA-256 of $2000-$5FFF], from Apple2TS
  1: [2, 'f4d769d85bb98476'], 2: [1, '0fc46593d2bdfe47'], 3: [2, '9c7a696a09d91d22'],
  6: [1, 'cb30647db1ed5d6e'], 8: [1, '9febfa442e392f04'], 40: [1, 'fc10184b9e5d167c'],
  120: [1, 'b5f06a368978239b'], 240: [1, 'aa4eb65d2ccc2ae7'], 241: [2, '45739554bdfb5001'],
  280: [1, '3fb2badf3be006b4'], 320: [1, '769b3e4852dbe2b5'], 400: [1, '14d2149c3f516887'],
  401: [2, '002d62b828dcb914'], 450: [1, '0ca9fcd2e843213b'], 500: [1, '15ab30311f1cc8bf'],
  550: [1, 'f7f263778ac77225'], 551: [2, '9de30ed5621fa356'], 600: [1, 'ef47356dc502e5e8'],
};
let bad = 0;
const s = KarDemo.start({ engine: g.listing('parts/engine/listing.json'), title: g.listing('parts/title/listing.json') });
const last = Math.max(...Object.keys(LIVE).map(Number));
for (let f = 1; f <= last; f++) {
  const { page } = KarDemo.next(s);
  if (!LIVE[f]) continue;
  const hash = crypto.createHash('sha256').update(s.m.subarray(0x2000, 0x6000)).digest('hex').slice(0, 16);
  if (page !== LIVE[f][0] || hash !== LIVE[f][1]) {
    bad++;
    console.log(`FAIL flip ${f}: page ${page}, pages ${hash}; Apple2TS showed page ${LIVE[f][0]}, pages ${LIVE[f][1]}`);
  }
}
if (bad) process.exit(1);
console.log(`test_demo: flips ${Object.keys(LIVE).join(', ')} of the title and the demo match Apple2TS byte for byte`);
