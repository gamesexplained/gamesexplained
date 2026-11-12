#!/usr/bin/env node
// Hold graphics.html's loading picture (the block svs-loading-data) to the cassette. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 120 seconds into Beyond's 1984 cassette, the Ultimate Tape Archive's "Spy_vs_Spy_Side_1.tap" (507,373 bytes,
// SHA-256 462adfb5a6a118e5dc9a9aea2628b65efa928ba5c3f240d1241ad6f457807f96), with the picture up.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in 104,428 of its
// 104,448 pixels; the rest are VICE's grey dots where the loader stores to the border colour mid-line, and
// single pixels at the edges of the border's stripes.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 0 ($DD00 = $97),
//   screen at $0400 and bitmap at $2000 ($D018 = $1D), light grey background;
// - the border: the frame's 49 writes are all to $D020, each storing the colour after the one before;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - the video chip's mode and the sound chip read every 25 frames from the start of the tape: the bitmap on between 63.5
//   and 64.0 seconds in and off between 187.5 and 188.0, and the sound chip silent until 225.5 seconds, when
//   the game had started.
// The disk, the C64 Preservation Project's spy_vs_spy[first_star_1984](m4)(!).g64, read 60 seconds in, holds the
// same bitmap, screen colours and colour RAM in every byte, at the same addresses.
// It exits 1 on any difference.
//   node games/c64/spy-vs-spy/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="svs-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no svs-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), '400:1000,2000:8000,3fff:1');
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,1d');
check('background', F.vic[0x21] & 15, 15);
check('$DD00', F.cia2[0], 0x97);
check('register writes in the frame', F.writes.length, 49);
check('every write is to $D020', F.writes.every((w) => w[2] === 0xD020), true);
check('each the colour after the one before', F.writes.every((w, i) => !i || (w[4] & 15) === ((F.writes[i - 1][4] + 1) & 15)), true);
check('bitmap $2000-$3F3F', sha(mem.subarray(0x2000, 0x3F40)), 'b4a0f45138397553fd5081ac10b59f9b23631472271d552285b468eb85dfb869');
check('screen colours $0400-$07E7', sha(mem.subarray(0x0400, 0x07E7 + 1)), '35834204edec4b8d5506bbbcd86c27943f65b98b724c20e02796c22147004e8e');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '541b3e9daa09b20bf85fa273e5cbd3e80185aa4ec298e765db87742b70138a53');
check('the picture, with the border as the loader left it', sha(C64.renderFrame(F).px), 'f339350df5ebf8c61bdcc949147394f3fc7afddd517056b4bfecbd011afb5570');
check('the page says so', ['whole, 64 seconds into the tape', 'for just over two minutes while the game loads', 'shows the same picture, byte for byte'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "spy-vs-spy loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
