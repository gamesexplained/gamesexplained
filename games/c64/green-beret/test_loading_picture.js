#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks gb-loading-data and gb-loading) to the cassette.
// The block gb-loading-data is one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py
// capture, then trim) on 11 November 2026, 130 seconds into the Imagine cassette, the Ultimate Tape
// Archive's "Green_Beret.tap" (724,171 bytes, SHA-256
// 03c923eab33b067da5c060747d2024934e18d24ae3401b84f5638ec0bfd8d09d), with the picture on the screen.
// `frame.py compare` found C64.renderFrame's drawing of that recording equal to VICE's own picture
// in 104,447 of its 104,448 pixels. The tape is not in the repository, so the test holds the page to
// the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3
//   ($DD00 = $C0), screen at $CC00 and bitmap at $E000 ($D018 = $39), a black border and a blue
//   background;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - how it arrives (the block gb-loading): memory read every 10 frames from 66 seconds in showed
//   the screen colours whole from 70.2 seconds and the bitmap filling from $E000 upward, every
//   byte past the front 0, from 71.6 seconds to the last byte at 97.6. The picture's first 173 bytes
//   are 0, so the front reads 173 from the start. GB_FRONT holds the front at each read from 71.6
//   seconds on; a partial picture must be the picture's bytes up to it and 0 after.
// It exits 1 on any difference.
//   node games/c64/green-beret/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { gbLoadingFrame, GB_FRONT } = g.run('graphics.html', 'gb-loading', 'gbLoadingFrame', 'GB_FRONT');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="gb-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no gb-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
check('$D011', F.vic[0x11], 0x3B);
check('$D016', F.vic[0x16], 0xD8);
check('$D018', F.vic[0x18], 0x39);
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,6');
check('$DD00', F.cia2[0], 0xC0);
check('register writes in the frame', F.writes.length, 0);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), '948a497d4c9fa5b24cd2f63a96a977cb0f12a31a5428f3bc04f2ebb5d0ea92da');
check('screen colours $CC00-$CFE7', sha(mem.subarray(0xCC00, 0xCFE8)), '1530dbb744393140f8ef6b5348c39094dfc5ff4ba1780638554ce29a7a1d4b1a');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '94b60f7017bbfc8a3ff374f7df388629b2294e2fb13ae47b218f84c65f581062');
const whole = sha(C64.renderFrame(F).px);
check('the picture', whole, '76485fa1a01a033d377817dfd47079ba4be34a8d6bd1bf02683bbf3db5f3b010');
check('the picture, all of it in', sha(C64.renderFrame(gbLoadingFrame(F, mem, 8000)).px), whole);
check('the picture\'s first 173 bytes are 0', mem.subarray(0xE000, 0xE000 + 173).every((v) => v === 0), true);

check('front: reads', GB_FRONT.length, 131);
check('front: from 173 to 8,000', [GB_FRONT[0], GB_FRONT[GB_FRONT.length - 1]].join(), '173,8000');
check('front: never goes back', GB_FRONT.every((v, i) => !i || v >= GB_FRONT[i - 1]), true);
for (const n of [0, 173, 4321, 7999]) {
  const P = gbLoadingFrame(F, mem, n);
  let wrong = 0;
  for (let i = 0; i < 8000; i++) if (P.mem[0xE000 + i] !== (i < n ? mem[0xE000 + i] : 0)) wrong++;
  check(`picture with ${n} bytes in`, wrong, 0);
}

console.log(bad ? bad + ' difference(s)' : "green-beret loading picture: the page's frame is the one recorded from the tape, and fills in at the recorded pace");
process.exit(bad ? 1 : 0);
