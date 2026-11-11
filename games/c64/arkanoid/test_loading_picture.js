#!/usr/bin/env node
// Hold graphics.html's loading picture (the block ark-loading) to the cassette. The page draws the title
// picture from the listing and lets its bitmap arrive at the tape's pace (AK_FRONT). It was measured
// in VICE 3.10 with vice-mcp 3.14.0 on 11 November 2026, loading the 1987 cassette, the Ultimate Tape
// Archive's "Arkanoid.tap" (640,955 bytes, SHA-256
// d1f218962fa31396e580fdd390e256e92fd5dcadd0736550d71236ba2bc63a81):
// - the picture's three parts as the tape leaves them, 115 seconds in, hash as below, and the
//   listing's bitmap ($4000), screen colours ($6000) and colour RAM copy ($6400) must too;
// - a frame recorded then (kit/c64/frame.py capture, 150 seconds in) drew, through site/lib/c64.js,
//   VICE's own picture in 104,447 of its 104,448 pixels; the other is a grey dot in the bottom
//   border, where the loader stores to the border colour every frame and the emulated 8565 video
//   chip shows a grey pixel for the store. The page's whole picture must draw exactly as that frame;
// - memory read every half second from 55 seconds in showed the bitmap filling from $4000 upward
//   with every byte past the front still 0, and the screen colours and colour RAM already whole
//   when the screen came on: AK_FRONT holds the front, from 0 to 8,000, and a partial picture must
//   be the listing's bytes up to it and 0 after.
// It exits 1 on any difference.
//   node games/c64/arkanoid/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { arkLoadingFrame, AK_FRONT, AK_VIC } = g.run('graphics.html', 'ark-loading', 'arkLoadingFrame', 'AK_FRONT', 'AK_VIC');
const L = g.listing();
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('bitmap $4000-$5F3F', sha(L.ram.subarray(0x4000, 0x5F40)), '8947449dee2b447afc3ce609fe4862a58c744d99e44fc9eddafa8f06ff333edd');
check('screen colours $6000-$63E7', sha(L.ram.subarray(0x6000, 0x63E8)), '60923da65caf5fe42244096763dcc72d9f4b8275d267e926d7377012d8530abc');
check('colour RAM from $6400', sha(Array.from(L.ram.subarray(0x6400, 0x67E8), (c) => c & 15)), '03fd1e02ef44a0084ad9422b7a2f6a186ec88e3f83f6179b336df333a8e10101');

check('$D011', AK_VIC[0x11], 0x3B);
check('$D016', AK_VIC[0x16], 0xD8);
check('$D018', AK_VIC[0x18], 0x81);
check('border, background', [AK_VIC[0x20] & 15, AK_VIC[0x21] & 15].join(), '0,1');
check('the whole picture', sha(C64.renderFrame(arkLoadingFrame(L.ram, 8000)).px), 'edb96c0b847a22786c9810e6754efc8ceffb2a3517cbf8565cc5ea6036582f79');

check('front: half seconds', AK_FRONT.length, 77);
check('front: from 0 to 8,000', [AK_FRONT[0], AK_FRONT[AK_FRONT.length - 1]].join(), '0,8000');
check('front: never goes back', AK_FRONT.every((v, i) => !i || v >= AK_FRONT[i - 1]), true);
for (const n of [0, 1234, 4321, 7999]) {
  const F = arkLoadingFrame(L.ram, n);
  let wrong = 0;
  for (let i = 0; i < 8000; i++) if (F.mem[0x4000 + i] !== (i < n ? L.ram[0x4000 + i] : 0)) wrong++;
  check(`picture with ${n} bytes loaded`, wrong, 0);
}

console.log(bad ? bad + ' difference(s)' : "arkanoid loading picture: the listing's picture is the tape's, draws as the recorded frame, and fills in at the recorded pace");
process.exit(bad ? 1 : 0);
