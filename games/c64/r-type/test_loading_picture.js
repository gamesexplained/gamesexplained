#!/usr/bin/env node
// Hold graphics.html's loading picture (the block rt-loading-data) to the disk. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 30 seconds into Electric Dreams' 1988 disk, side 1, the C64 Preservation Project's
// "r-type_s1[electric_dreams_1988](pal)(!).g64" (278,234 bytes, SHA-256
// a967c3385c7b6b776619bab8c51680f0ee2bf8b1f89c8e5242e031ea4bf5ba92), with the picture up.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in all 104,448
// pixels. The disk is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the disk sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3
//   ($DD00 = $C0), screen at $CC00 and bitmap at $E000 ($D018 = $39), black border and background,
//   and no writes in the frame;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - memory read every 10 frames from 8 seconds in showed the screen off until the picture was whole,
//   and the bitmap screen on at about 15 seconds.
// It exits 1 on any difference.
//   node games/c64/r-type/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="rt-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no rt-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,39');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('$DD00', F.cia2[0], 0xC0);
check('register writes in the frame', F.writes.length, 0);
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), '31dab380e9afe54923d900eb7857b35ad9eefa897b189258c5b74e6cff0316db');
check('screen colours $CC00-$CFE7', sha(mem.subarray(0xCC00, 0xCFE8)), '88bfad670531281286520ba77eb5994cc4aee8a8787ac1a1bb4411d18cb97965');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), 'cf552029acf7f3629f89ba0799e92f45e62afc7e81aba42ba8def61c419edffb');
check('the picture', sha(C64.renderFrame(F).px), '35c14a5b374db94ef2c5bdcbe9ed4126f53f0680ce699c01e27a8a33d45797d2');

console.log(bad ? bad + ' difference(s)' : "r-type loading picture: the page's picture is the frame recorded from the disk");
process.exit(bad ? 1 : 0);
