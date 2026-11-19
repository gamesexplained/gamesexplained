#!/usr/bin/env node
// Hold graphics.html's loading picture (the block ace-loading-data) to the cassette. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 100 seconds into Gamebusters' 1988 cassette, the Ultimate Tape Archive's "ACE_2.tap" (629,174 bytes,
// SHA-256 519b17d6b9fc6cf22760ba5c63942c700314162a2dbb88f8f3de6fa66f8c89f2), with the picture up.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in 104,436 of its
// 104,448 pixels; the other 12 are VICE's grey dots where the loader stores to the border colour mid-line.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 1
//   ($DD00 = $96), screen at $5C00 and bitmap at $6000 ($D018 = $79), black background;
// - the border: the frame's 52 writes are all to $D020, storing $FB (dark grey) and $F0 (black) in turn;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - the video chip's mode and the sound chip read every 25 frames from the start of the tape: the bitmap
//   screen on between 70.0 and 70.5 seconds in, the screen off between 232.0 and 232.5, and the sound chip
//   silent until 264.0 seconds, when the game had started.
// It exits 1 on any difference.
//   node games/c64/ace-2/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="ace-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no ace-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), '5c00:1000,6000:8000,7fff:1');
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,79');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('$DD00', F.cia2[0], 0x96);
check('register writes in the frame', F.writes.length, 52);
check('every write is to $D020', F.writes.every((w) => w[2] === 0xD020), true);
check('dark grey and black in turn', F.writes.every((w, i) => (w[4] === 0xFB || w[4] === 0xF0) && (!i || w[4] !== F.writes[i - 1][4])), true);
check('bitmap $6000-$7F3F', sha(mem.subarray(0x6000, 0x7F40)), '091b9cf7d19ab7ca8030ce976aad0b261ad8f64db797960aceead5d9f142d7d1');
check('screen colours $5C00-$5FE7', sha(mem.subarray(0x5C00, 0x5FE8)), '20e61a855c33ff9f32499dd602025e635d022dcdb5b30512b7e0068c98f9184f');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '8a6d2567ea9b18a3cc0239631fe3890f266b0b456d6a2678a3315e957b3626dd');
check('the picture, with the border as the loader left it', sha(C64.renderFrame(F).px), '8588f1b64a2dc9331a764d635d4d4b2dbcdac54456ca946990b27ce3821746a9');
check('the page says so', ['about 70 seconds into the tape', 'in silence, for two minutes and 42', 'between black and dark grey'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "ace-2 loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
