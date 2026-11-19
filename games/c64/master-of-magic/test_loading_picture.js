#!/usr/bin/env node
// Hold graphics.html's loading picture (the block mom-loading-data) to the cassette. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 150 seconds into Mastertronic Added Dimension's 1985 cassette, the Ultimate Tape Archive's
// "Master_of_Magic.tap" (900,910 bytes, SHA-256 ed45f622d4cbf5d6aa5638671f9e62c14352c6106eb14aaedf50c0a6a331a59c),
// with the picture up. `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in
// 104,426 of its 104,448 pixels; 12 of the others are VICE's grey dots where the loader stores to the border
// colour mid-line, and 10 are a pixel where a stripe changes colour a pixel away from VICE's.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3
//   ($DD00 = $C4), screen at $CC00 and bitmap at $E000 ($D018 = $39), black background;
// - the border: the frame's 42 writes are all to $D020, each storing the next of the sixteen colours
//   ($F0 to $FF, and 0 in $F0's place), as the loader's INC of the border colour leaves it;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - the video chip's mode and the sound chip read every 25 frames from the start of the tape: the screen off
//   from 38.0 seconds in, the bitmap screen on between 94.0 and 94.5, the screen off again between 328.0 and
//   328.5, and the sound chip silent until 404.5 seconds, when the game had started.
// It exits 1 on any difference.
//   node games/c64/master-of-magic/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="mom-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no mom-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'cc00:1000,e000:8000,ffff:1');
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,39');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '4,0');
check('$DD00', F.cia2[0], 0xC4);
check('register writes in the frame', F.writes.length, 42);
check('every write is to $D020', F.writes.every((w) => w[2] === 0xD020), true);
check('each moves the border on one colour', F.writes.every((w, i) => !i || (w[3] & 15) === ((F.writes[i - 1][3] + 1) & 15)), true);
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), '4078bb50c76362e0548c1136d93160bc71e8cc7c17e1d18ba95208828ef7cf4b');
check('screen colours $CC00-$CFE7', sha(mem.subarray(0xCC00, 0xCFE8)), '61add0a5414cf200a7f37deea9c55d4453bd936c944dff566091d975701be548');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), 'd12102fdc34a6cd2abd425f3ba8c1cc2752a9c88a745fbb232e2407117f71aee');
check('the picture, with the border as the loader left it', sha(C64.renderFrame(F).px), '0f8d614ada77326970b16a6aa585344bfd244ee32c198cce826c9d00929668d8');
check('the page says so', ['puts it up whole, about 95 seconds into the tape', 'in silence, for three minutes and 54 seconds', 'next of the C64\'s sixteen colours'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "master-of-magic loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
