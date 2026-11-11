#!/usr/bin/env node
// Hold graphics.html's loading picture (the block sen-loading-data) to the cassette. The block is
// one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) 250
// seconds into the 1986 Firebird tape, the Ultimate Tape Archive's "Sentinel, The.tap" (SHA-256
// b1b8ee375b605adeee846fa7a82c8aff3548426dfc32c1e52fe4961f039ded5a, orientation.md), with the
// picture on the screen. `frame.py compare` found C64.renderFrame's drawing of that recording equal
// to VICE's own picture of the frame in all 104,448 pixels. The tape is not in the repository, so
// the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 1
//   ($DD00 = $C6), bitmap at $4000 and screen at $6000 ($D018 = $81), black background;
// - the bitmap, the screen colours and colour RAM (light grey in every cell) by their hashes;
// - the picture site/lib/c64.js draws from the block by the hash of the recording's drawing.
// It exits 1 on any difference.
//   node games/c64/the-sentinel/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="sen-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no sen-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
check('$D011', F.vic[0x11], 0x3B);
check('$D016', F.vic[0x16], 0xD8);
check('$D018', F.vic[0x18], 0x81);
check('$D021', F.vic[0x21] & 15, 0);
check('$DD00', F.cia2[0], 0xC6);
check('register writes in the frame', F.writes.length, 0);

const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('bitmap $4000-$5F3F', sha(mem.subarray(0x4000, 0x5F40)), 'fb29ecbd9e3bdb090bf82b6cfe7f64dadd62ddbc817278ec52a151e235cff244');
check('screen colours $6000-$63E7', sha(mem.subarray(0x6000, 0x63E8)), '11029e2d287906527bd2d95c1438e8f327d7c99a8b0ce2f95fcdfeb539be5858');
const colour = Buffer.from(F.colour, 'base64').subarray(0, 1000);
check('colour RAM, cells not light grey', colour.filter((c) => (c & 15) !== 15).length, 0);
check('the picture', sha(C64.renderFrame(F).px), '7af5b1aecd8e5942480df41400f77a04b08b86193445c8babdc4a2175f0d04e6');

console.log(bad ? bad + ' difference(s)' : "the-sentinel loading picture: the page's frame is the one recorded from the tape, and draws its 104,448 pixels");
process.exit(bad ? 1 : 0);
