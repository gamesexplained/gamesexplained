#!/usr/bin/env node
// Hold graphics.html's loading picture (the block scr-loading-data) to the cassette. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 180 seconds into Kixx's cassette, the Ultimate Tape Archive's "Stunt_Car_Racer.tap" (565,294 bytes,
// SHA-256 ec03567155a83ffe1fcf624083976fddaf8a1644e833fde1be163eed55ffda77), with the picture up.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in 104,431 of its
// 104,448 pixels; the rest are VICE's grey dots where the loader stores to the border colour mid-line, and
// single pixels at the edges of the border's stripes.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 0 ($DD00 = $97),
//   screen at $0800 and bitmap at $2000 ($D018 = $29), black background;
// - the border: the frame's 36 writes are all to $D020, each storing the colour after the one before;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - the video chip's mode and the sound chip read every 25 frames from the start of the tape: the bitmap on between 91.5
//   and 92.0 seconds in and off between 264.5 and 265.0, and the sound chip silent for all of the 345 seconds
//   read.
// The disk, the C64 Preservation Project's stunt_car_racer[microprose_1989](pal).g64, read 45 seconds in, holds
// the same bitmap, screen colours and colour RAM in every byte, at $C000 and $E000.
// It exits 1 on any difference.
//   node games/c64/stunt-car-racer/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="scr-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no scr-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), '800:1000,2000:8000,3fff:1');
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,29');
check('background', F.vic[0x21] & 15, 0);
check('$DD00', F.cia2[0], 0x97);
check('register writes in the frame', F.writes.length, 36);
check('every write is to $D020', F.writes.every((w) => w[2] === 0xD020), true);
check('each the colour after the one before', F.writes.every((w, i) => !i || (w[4] & 15) === ((F.writes[i - 1][4] + 1) & 15)), true);
check('bitmap $2000-$3F3F', sha(mem.subarray(0x2000, 0x3F40)), 'c671a8ad6027e05186fe7d7a5cb53264c585fe009a283e56c04f37d84124c837');
check('screen colours $0800-$0BE7', sha(mem.subarray(0x0800, 0x0BE7 + 1)), '23f4d634a7af4c1c0aad605f5b15fb19bc9a53f0df2fad067199188cd6ba4762');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '62108c3c3957740d363279a3e338468c8342b27f5e58a63b55552daeda923c90');
check('the picture, with the border as the loader left it', sha(C64.renderFrame(F).px), '21cea5e0334dac14f4ed3be88e7d2c20996c9acdea07eeaef53e839c7cd1dba9');
check('the page says so', ['whole, 92 seconds into the tape', 'for nearly three minutes while the game loads', 'The disk shows the same picture, byte for byte'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "stunt-car-racer loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
