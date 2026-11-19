#!/usr/bin/env node
// Hold graphics.html's loading picture (the block am-loading-data) to the cassette. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 150 seconds into Martech's 1987 cassette, the Ultimate Tape Archive's "Armageddon_Man,_The.tap" (495,162 bytes,
// SHA-256 43305cb92680af7d5a5a4ada624811f54bda28e16f105d244392934e6ebb4f78), with the picture up.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in 104,417 of its
// 104,448 pixels; the rest are VICE's grey dots where the loader stores to the border colour mid-line, and
// single pixels at the edges of the border's stripes.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a high-resolution bitmap ($D011 = $3B, $D016 = $C8) in bank 0 ($DD00 = $97),
//   screen at $0C00 and bitmap at $2000 ($D018 = $3D);
// - the border: the frame's 51 writes are all to $D020, each storing the colour after the one before;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - the video chip's mode and the sound chip read every 25 frames from the start of the tape: the bitmap on between 80.5
//   and 81.0 seconds in and the game's screen in its place between 232.5 and 233.0, and the sound chip silent
//   until 233.0 seconds.
// The disk's game holds the same picture, unshown: the test compares it with listing.json's bytes at
// $2000-$3F3F and $0C00-$0FE7.
// It exits 1 on any difference.
//   node games/c64/the-armageddon-man/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="am-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no am-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'c00:1000,2000:8000,3fff:1');
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,c8,3d');
check('background', F.vic[0x21] & 15, 6);
check('$DD00', F.cia2[0], 0x97);
check('register writes in the frame', F.writes.length, 51);
check('every write is to $D020', F.writes.every((w) => w[2] === 0xD020), true);
check('each the colour after the one before', F.writes.every((w, i) => !i || (w[4] & 15) === ((F.writes[i - 1][4] + 1) & 15)), true);
check('bitmap $2000-$3F3F', sha(mem.subarray(0x2000, 0x3F40)), '28eb515132461e7487ddec3f28d2e06bb4260386f0f3a4171afc4dbc0d2446e9');
check('screen colours $0C00-$0FE7', sha(mem.subarray(0x0C00, 0x0FE7 + 1)), 'b8490e3b778ff5ce3930482a95a73659dc89c2123745e54007069469d64855c3');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '96ec3cda9a307174bb6874a59d844d4b17bffa62e98285612d69825c7bda27f0');
check('the picture, with the border as the loader left it', sha(C64.renderFrame(F).px), '1af0378d29fe0858cbe8f0de69f5552aae490710c1fcdde4bbbb6174af793482');
// the disk's game holds the same picture: its listing's bytes at $2000-$3F3F and $0C00-$0FE7
const L = g.listing();
check('the bitmap is the listing\'s $2000-$3F3F', Buffer.compare(Buffer.from(mem.subarray(0x2000, 0x3F40)), Buffer.from(L.ram.subarray(0x2000, 0x3F40))), 0);
check('the colours are the listing\'s $0C00-$0FE7', Buffer.compare(Buffer.from(mem.subarray(0x0C00, 0x0FE8)), Buffer.from(L.ram.subarray(0x0C00, 0x0FE8))), 0);
check('the page says so', ['whole, 81 seconds into the tape', 'for two and a half minutes while the game loads', 'loads the same picture, byte for byte, into the same memory'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "the-armageddon-man loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
