#!/usr/bin/env node
// Hold graphics.html's loading picture (the block ch-loading-data) to the cassette. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 100 seconds into Mastertronic's 1984 cassette, the Ultimate Tape Archive's "Chiller.tap" (533,274 bytes,
// SHA-256 1ea35f20d0d14b4f44999a8f483cc50dda12a7b55767a698a72e9b06f0b46a95), with the picture up.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in 104,420 of its
// 104,448 pixels; 15 of the others are VICE's grey dots where the loader stores to the border colour
// mid-line, and 13 are the pixel beside each, where the stripe changes colour a pixel away from VICE's.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3
//   ($DD00 = $C4), screen at $CC00 and bitmap at $E000 ($D018 = $39), black background;
// - the border: the frame's 51 writes are all to $D020, each storing the next of the sixteen colours
//   ($F0 to $FF, one store of 0), as the loader's INC of the border colour leaves it;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - memory read every 10 frames from 55 seconds in showed the bitmap whole by 57 seconds with the
//   screen off ($D011 = $0B), and the bitmap screen on, the picture whole, at 71.4 seconds.
// It exits 1 on any difference.
//   node games/c64/chiller/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="ch-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no ch-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,39');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '13,0');
check('$DD00', F.cia2[0], 0xC4);
check('register writes in the frame', F.writes.length, 51);
check('every write is to $D020', F.writes.every((w) => w[2] === 0xD020), true);
check('each moves the border on one colour', F.writes.every((w, i) => !i || (w[3] & 15) === ((F.writes[i - 1][3] + 1) & 15)), true);
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), '83aa4afde2fcdd3289ea0dfb75dc7c816e92db9caf60e2b7a659a1ea8a11310d');
check('screen colours $CC00-$CFE7', sha(mem.subarray(0xCC00, 0xCFE8)), '2e3d68770397a2258a3af653500739cb93aa83c425e6b4791a3a4ee39332cd37');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), 'e03eabd0e138426b0d07ed7a92a901cd1103ea1e44abdcb6116c0ce870950c27');
check('the picture, with the border as the loader left it', sha(C64.renderFrame(F).px), '42aa3e6f8b30bad8f383aea97cf869607704bcbf7031993fb559a5546f598b81');

console.log(bad ? bad + ' difference(s)' : "chiller loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
