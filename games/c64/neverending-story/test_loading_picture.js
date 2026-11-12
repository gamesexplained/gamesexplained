#!/usr/bin/env node
// Hold graphics.html's loading picture (the block nes-loading-data) to the cassette, Ocean's 1985 tape, the
// Ultimate Tape Archive's "Neverending_Story,_The_Tape_1_Side_1.tap" (417,847 bytes, SHA-256
// 8c261dce64feada093bebd464497c3112978a8e77f3eb403541e979fc5f4f4b4), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026. The block is one frame recorded with kit/c64/frame.py capture, then trim, 150 seconds in,
// with the picture up: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 1 ($DD00 = $96), bitmap at $4000
// and screen at $6000 ($D018 = $81), black background and border, and no register written during the frame.
// `frame.py compare` found the drawing of it equal to VICE's own picture in all 104,448 pixels.
// - memory read every 25 frames from 40 seconds in: the screen was blank from 69.0 seconds while the bitmap, its
//   colours and colour RAM came in, came on with the picture whole between 100.0 and 100.5 seconds, and showed the
//   game's own screen between 195.0 and 195.5; the sound chip read every 10 seconds was silent until then;
// - the drawing, mapped to the nearest of the palette's colours, is the same in all 104,448 pixels as
//   reference/loading-picture.png, the crack's picture that discoveries.html shows.
// It exits 1 on any difference.
//   node games/c64/neverending-story/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="nes-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no nes-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), '4000:8000,6000:1000,7fff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,81,96');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('no register written during the frame', F.writes.length, 0);
check('bitmap $4000-$5F3F', sha(mem.subarray(0x4000, 0x5F3F + 1)), 'a4f319eef72e23b55261a0bc8eada57b016bfb40e9908b59948e19519e8e0358');
check('screen colours $6000-$63E7', sha(mem.subarray(0x6000, 0x63E7 + 1)), '239806427f1bf53be7c2b44630690e01de885fa54130b70cf8e4d09f0a0af445');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), 'e88fc340399564009506515b6facf75b3f13373cfe95ab795f796be64b5f6006');
check('the picture drawn', sha(C64.renderFrame(F).px), 'c4c7a2663629419d6ebd8156f452842856e47e6bd4ecb7a6103b2edd53b9085a');
check('the page says so', ['puts it up whole, 100 seconds into the tape', 'for a minute and a half while the first part of the game loads', 'the same in every pixel'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "neverending-story loading picture: the page's picture is the frame recorded from the tape");
process.exit(bad ? 1 : 0);
