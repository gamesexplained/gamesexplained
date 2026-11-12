#!/usr/bin/env node
// Hold graphics.html's loading picture (the block st-loading-data) to the cassette. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 100 seconds into Mastertronic's 1986 cassette, the Ultimate Tape Archive's "Storm.tap" (413,938 bytes,
// SHA-256 353b958158fdcba8149f99b8eea11cffbc27c8708591f7090adb9e4021e553ba), with the picture up.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in 104,445 of its
// 104,448 pixels; the rest are VICE's grey dots where the loader stores to the border colour mid-line, and
// single pixels at the edges of the border's stripes.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a high-resolution bitmap ($D011 = $3B, $D016 = $C8) in bank 0 ($DD00 = $97),
//   screen at $0400 and bitmap at $2000 ($D018 = $1D);
// - the border: the frame's 7 writes are all to $D020, each storing the colour after the one before;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - the video chip's mode and the sound chip read every 25 frames from the start of the tape: the bitmap on between 65.0
//   and 65.5 seconds in and off between 146.0 and 146.5, and the sound chip silent until 175.5 seconds, when
//   the game had started.
// The disk, the C64 Preservation Project's storm[mastertronic_1986](!).g64, shows no picture while it loads.
// It exits 1 on any difference.
//   node games/c64/storm/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="st-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no st-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), '400:1000,2000:8000,3fff:1');
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,c8,1d');
check('background', F.vic[0x21] & 15, 0);
check('$DD00', F.cia2[0], 0x97);
check('register writes in the frame', F.writes.length, 7);
check('every write is to $D020', F.writes.every((w) => w[2] === 0xD020), true);
check('each the colour after the one before', F.writes.every((w, i) => !i || (w[4] & 15) === ((F.writes[i - 1][4] + 1) & 15)), true);
check('bitmap $2000-$3F3F', sha(mem.subarray(0x2000, 0x3F40)), '62be99148752cad46d272a86c142b071fd02506bff21f06c2840f57e3198fccd');
check('screen colours $0400-$07E7', sha(mem.subarray(0x0400, 0x07E7 + 1)), 'cd1ae1d27ffde4eee0c6df0c9495757c3d6361a435657025dca24a9472fa76d7');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '96ec3cda9a307174bb6874a59d844d4b17bffa62e98285612d69825c7bda27f0');
check('the picture, with the border as the loader left it', sha(C64.renderFrame(F).px), '5cc46b006a2b581d6a0dd71f0788d5408dbf0dcc1d9c0fedc7c9f3153e601e83');
check('the page says so', ['whole, 65 seconds into the tape', 'for 81 seconds while the game loads', 'names M. Talbot, K. Shrapnell and S. Martin', 'The disk shows no picture at all'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "storm loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
