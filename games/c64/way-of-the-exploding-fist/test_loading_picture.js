#!/usr/bin/env node
// Hold graphics.html's loading picture (the block wf-loading-data) to the cassette, Melbourne House's 1985 tape,
// the Ultimate Tape Archive's "Way_of_the_Exploding_Fist,_The.tap" (596,605 bytes, SHA-256
// 81d407d5877d5faaad40c9b10b8542790c0a064f81bac9cea9a2ac6217081695), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026. The block is one frame recorded with kit/c64/frame.py capture, then trim, 200 seconds in,
// with the picture up: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3 ($DD00 = $C0), screen at $CC00
// and bitmap at $E000 ($D018 = $39), white background. `frame.py compare` found the drawing of it equal to
// VICE's own picture in 104,430 of its 104,448 pixels; the rest are VICE's grey dots where the loader stores to
// the border colour mid-line, and single pixels at the edges of the border's stripes.
// - memory read every 25 frames from 40 seconds in: the bitmap came on between 137.5 and 138.0 seconds, whole,
//   and the screen went blank between 320.0 and 320.5;
// - stores to the sound chip counted every 10 frames: the loader played its shout, 5,596 stores to $D418, from
//   138.0 to 140.4 seconds, and nothing else until the game (test_loading_shout.js);
// - the disk, the C64 Preservation Project's kung-fu_way_of_the_exploding_fist[melbourne_house_1985](pal)(!).g64,
//   with 1 pressed at its menu 20 seconds in, played the same shout and put up the picture 65.8 seconds in. Its
//   file M.PICTURE (10,002 bytes, SHA-256 60d824c30311f5b3d981c58bb7194eacc3505afbccbbe21733627cbab0a573da) is
//   the cassette's bitmap and screen, byte for byte, and its colour RAM in the low four bits of each byte: the
//   test holds the bitmap and screen to its bytes 2-9001.
// It exits 1 on any difference.
//   node games/c64/way-of-the-exploding-fist/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="wf-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no wf-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'cc00:1000,e000:8000,ffff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,39,c0');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '4,1');
check('register writes in the frame: all to $D020, each the colour after the one before', [F.writes.length, F.writes.every((w) => w[2] === 0xD020), F.writes.every((w, i) => !i || (w[4] & 15) === ((F.writes[i - 1][4] + 1) & 15))].join(), '51,true,true');
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF3F + 1)), '26363b7e7ae086e8a2e526900f606eb37278b72190f24a76521b15eba6bc7f34');
check('screen colours $CC00-$CFE7', sha(mem.subarray(0xCC00, 0xCFE7 + 1)), 'ace40fd9c4fbe81eb19fbc02709eb6c2aebcb61b21b66319941fd5279144a4b7');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '78fae5ff3a11bbfff1306702be412853adfc3c9029166243b5aa718ab018b5ba');
check('the picture drawn', sha(C64.renderFrame(F).px), 'ddfb335315168c7de714bf0d327bb38a88724b05d7e3a231f604c23c35d28d22');
check('the disk\'s M.PICTURE: bitmap then screen', sha(Buffer.concat([mem.subarray(0xE000, 0xFF40), mem.subarray(0xCC00, 0xCFE8)])), '088f16360a75b67c65c424e5c6c572a102b6c2c7bf9e58eb7d4908e6fcea6dac');
check('the page says so', ['Then, 138 seconds in, it puts up its picture whole', 'for three minutes while the game loads', 'M.PICTURE, M.TSOUND and M.SPCHTBL', 'once 1 is pressed at its menu'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "way-of-the-exploding-fist loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
