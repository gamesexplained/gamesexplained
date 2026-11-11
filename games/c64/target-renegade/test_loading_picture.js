#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks tr-loading-data and tr-loading) to the cassette.
// The block tr-loading-data is one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py
// capture, then trim) on 11 November 2026, 150 seconds into the 1988 cassette's first side, the
// Ultimate Tape Archive's "Target- Renegade Side 1.tap" (992,738 bytes, SHA-256
// 11d5456bf7e6ad609174d4c968f4fe54397da9e4b2dc8d5b2324555f140be1d1), with the picture on the
// screen. `frame.py compare` found C64.renderFrame's drawing of that recording equal to VICE's own
// picture in 104,443 of its 104,448 pixels; the other 5 are VICE's grey dots where the loader
// stores to the border colour mid-line. The page leaves out those 48 border stores, the loader's
// stripes, and draws the border black: its drawing is the recording's in every pixel of the
// 320 by 200 picture. The tape is not in the repository, so the test holds the page to the
// recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3
//   ($DD00 = $C0), screen at $C800 and bitmap at $E000 ($D018 = $29), black background;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - how it arrives (the block tr-loading): memory read every 10 frames from 110 seconds in showed
//   the screen colours and colour RAM whole and the bitmap filling from $E000 upward, every byte
//   past the front 0, from the first byte at about 112.2 seconds to the last at 136.0. TR_FRONT
//   holds the front at each read from 112.2 seconds on; a partial picture must be the picture's
//   bytes up to it and 0 after.
// It exits 1 on any difference.
//   node games/c64/target-renegade/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { trLoadingFrame, TR_FRONT } = g.run('graphics.html', 'tr-loading', 'trLoadingFrame', 'TR_FRONT');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="tr-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no tr-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
check('$D011', F.vic[0x11], 0x3B);
check('$D016', F.vic[0x16], 0xD8);
check('$D018', F.vic[0x18], 0x29);
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('$DD00', F.cia2[0], 0xC0);
check('register writes in the frame', F.writes.length, 0);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), '5ef745e034134b63dc436c6b3a401499fa75a554715ae0b0222cf32d0683f27e');
check('screen colours $C800-$CBE7', sha(mem.subarray(0xC800, 0xCBE8)), '15e8fcd0af1ecbfff781adbac2d28c827513b01dcb7da41c6913d43f11247620');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '76806d03cc0c96bf3fd5d2f8b5805ceeaddf1b0f145096b64d9f75cca057629b');
const whole = sha(C64.renderFrame(F).px);
check('the picture', whole, 'f0b4b9703423c50dd898c2cf4d59e2a44de2cff8bd02ff13966649ab1c3585b3');
check('the picture, all of it in', sha(C64.renderFrame(trLoadingFrame(F, mem, 8000)).px), whole);

check('front: reads', TR_FRONT.length, 120);
check('front: from 0 to 8,000', [TR_FRONT[0], TR_FRONT[TR_FRONT.length - 1]].join(), '0,8000');
check('front: never goes back', TR_FRONT.every((v, i) => !i || v >= TR_FRONT[i - 1]), true);
for (const n of [0, 59, 4321, 7999]) {
  const P = trLoadingFrame(F, mem, n);
  let wrong = 0;
  for (let i = 0; i < 8000; i++) if (P.mem[0xE000 + i] !== (i < n ? mem[0xE000 + i] : 0)) wrong++;
  check(`picture with ${n} bytes in`, wrong, 0);
}

console.log(bad ? bad + ' difference(s)' : "target-renegade loading picture: the page's frame is the one recorded from the tape, and fills in at the recorded pace");
process.exit(bad ? 1 : 0);
