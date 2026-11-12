#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks rb-loading-data and rb-loading) to the cassette.
// The block rb-loading-data is one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py
// capture, then trim) on 12 November 2026, 130 seconds into the cassette, the Ultimate Tape Archive's
// "Rambo-_First_Blood_Part_II.tap" (743,231 bytes, SHA-256
// 34059888c29dc8d504cae593d4c3a3c5efde258b30a9af0dace1e72b74409bff), with the picture whole.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in 104,447 of
// its 104,448 pixels; VICE shows the other, in the middle of the picture, as a grey dot.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8)
//   in bank 1 ($DD00 = $92), screen at $5C00 and bitmap at $6000 ($D018 = $79), black border, yellow
//   background, and no writes in the frame;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - how it arrives (the block rb-loading): memory read every 10 frames from 70 seconds in showed
//   the screen turn on at about 73 seconds with a yellow background, the screen colours and then
//   colour RAM come in while the bitmap was still 0, from about 76 seconds to 81, and the bitmap
//   fill from $6000 upward, every byte past the front 0, from the first byte at about 80.6 seconds
//   to the last at 114.2. RB_FRONT holds the front at each read from 80.4 seconds on; a partial
//   picture must be the picture's bytes up to it and 0 after.
// It exits 1 on any difference.
//   node games/c64/rambo-first-blood-part-ii/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { rbLoadingFrame, RB_FRONT } = g.run('graphics.html', 'rb-loading', 'rbLoadingFrame', 'RB_FRONT');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="rb-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no rb-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,79');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,7');
check('$DD00', F.cia2[0], 0x92);
check('register writes in the frame', F.writes.length, 0);
check('bitmap $6000-$7F3F', sha(mem.subarray(0x6000, 0x7F40)), 'f59a2f7ea8d5448e8d530860f4fa7597354bf32cf15284cd232e5813abf5e3a6');
check('screen colours $5C00-$5FE7', sha(mem.subarray(0x5C00, 0x5FE8)), '4f5fd6c52bef24fce34ce67db91222d02e9c583f75cfdd85cab93a8d2c93d181');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '893c99cb58ff19730d24b60a2f0171d108701c3a9039a8c56d4c57576ff53c26');
const whole = sha(C64.renderFrame(F).px);
check('the picture', whole, '90fbd25978aa32c88e7467ff9833ae2332eeddfc779f7a89f871e45f5057019d');
check('the picture, all of it in', sha(C64.renderFrame(rbLoadingFrame(F, mem, 8000)).px), whole);
check('the screen before the first byte', sha(C64.renderFrame(rbLoadingFrame(F, mem, 0)).px), '261673c37c2bba782c4d6522d3a0eea5716e7f3bb60b2b08029292ab36cd2828');

const [reads, , , hash] = '170,0,8000,62ce0b0970ed36ddb2038e708299e9a187fd226f3338fedc1de89e18423711d3'.split(',');
check('front: reads', RB_FRONT.length, +reads);
check('front: from 0 to 8,000', [RB_FRONT[0], RB_FRONT[RB_FRONT.length - 1]].join(), '0,8000');
check('front: never goes back', RB_FRONT.every((x, i) => !i || x >= RB_FRONT[i - 1]), true);
check('front', sha(JSON.stringify(RB_FRONT)), hash);
for (const n of [0, 25, 4321, 7999]) {
  const P = rbLoadingFrame(F, mem, n);
  let wrong = 0;
  for (let i = 0; i < 8000; i++) if (P.mem[0x6000 + i] !== (i < n ? mem[0x6000 + i] : 0)) wrong++;
  check(`picture with ${n} bytes in`, wrong, 0);
}

console.log(bad ? bad + ' difference(s)' : "rambo-first-blood-part-ii loading picture: the page's picture is the one recorded from the tape, and fills in at the recorded pace");
process.exit(bad ? 1 : 0);
