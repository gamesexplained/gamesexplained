#!/usr/bin/env node
// Hold graphics.html's loading picture (the block sc-loading) to the cassette. The page draws the
// title picture from the listing and lets its bitmap arrive at the tape's pace (SC_FRONT). It was
// measured in VICE 3.10 with vice-mcp 3.14.0 on 11 November 2026, loading the cassette, the Ultimate
// Tape Archive's "Short_Circuit.tap" (643,155 bytes, SHA-256
// 6b51138710fa6bf6b8842b6520d9e43412caad4f335f8eb8afe85e46535ed1f2):
// - the tape's memory 150 seconds in held the listing's bitmap ($6000-$7F3F) and screen colours
//   ($5C00-$5FE7) byte for byte, and its colour RAM equalled the listing's copy at $8548; those
//   three must hash as below;
// - a frame recorded then (kit/c64/frame.py capture) drew, through site/lib/c64.js, VICE's own
//   picture in 104,447 of its 104,448 pixels, and the page's whole picture draws exactly as that
//   frame does: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 1 ($DD00 = $96, $D018 =
//   $79), black border and white background;
// - memory read every 10 frames from 62 seconds in showed the screen colours whole from 62.8
//   seconds, the screen coming on at 67.8 seconds with the colour RAM whole, and the bitmap filling
//   from $6000 upward with every byte past the front still 0, to the last byte at 102.0 seconds:
//   SC_FRONT holds the front at each read from 67.6 seconds, from 0 to 8,000, and a partial
//   picture must be the listing's bytes up to it and 0 after.
// It exits 1 on any difference.
//   node games/c64/short-circuit/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { scLoadingFrame, SC_FRONT, SC_VIC } = g.run('graphics.html', 'sc-loading', 'scLoadingFrame', 'SC_FRONT', 'SC_VIC');
const L = g.listing();
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('bitmap $6000-$7F3F', sha(L.ram.subarray(0x6000, 0x7F40)), 'f930d4a6c5868d5bce55542ce83434d9ccaea5599328ffa6f5146931aff96f80');
check('screen colours $5C00-$5FE7', sha(L.ram.subarray(0x5C00, 0x5FE8)), 'a278c6c408d02984f2507574dd35710ab50e043a65ae2f8b565d4c4a6422112d');
check('colour RAM from $8548', sha(Array.from(L.ram.subarray(0x8548, 0x8930), (c) => c & 15)), 'a93a7e512c7f32aa1cfae01b98e095ea2849741329963f5ad6f575dfc782e2b0');

check('$D011', SC_VIC[0x11], 0x3B);
check('$D016', SC_VIC[0x16], 0xD8);
check('$D018', SC_VIC[0x18], 0x79);
check('border, background', [SC_VIC[0x20] & 15, SC_VIC[0x21] & 15].join(), '0,1');
check('the whole picture', sha(C64.renderFrame(scLoadingFrame(L.ram, 8000)).px), 'aced53b0210c4198e8e4adf2ba9a2005269d90917c75febfff43b8d0a52fb66f');

check('front: reads', SC_FRONT.length, 173);
check('front: from 0 to 8,000', [SC_FRONT[0], SC_FRONT[SC_FRONT.length - 1]].join(), '0,8000');
check('front: never goes back', SC_FRONT.every((v, i) => !i || v >= SC_FRONT[i - 1]), true);
for (const n of [0, 5, 4321, 7999]) {
  const P = scLoadingFrame(L.ram, n);
  let wrong = 0;
  for (let i = 0; i < 8000; i++) if (P.mem[0x6000 + i] !== (i < n ? L.ram[0x6000 + i] : 0)) wrong++;
  check(`picture with ${n} bytes in`, wrong, 0);
}

console.log(bad ? bad + ' difference(s)' : "short-circuit loading picture: the listing's picture is the one the tape shows, and fills in at the recorded pace");
process.exit(bad ? 1 : 0);
