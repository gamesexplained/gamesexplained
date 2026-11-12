#!/usr/bin/env node
// Hold graphics.html's loading picture (the block en-loading-data) to the cassette, Pandora's 1987 tape, the
// Ultimate Tape Archive's "Into_the_Eagles_Nest.tap" (472,663 bytes, SHA-256
// 06c49f6e9b916fc90750fd47de9c1c92e779134419d7d0dee1c3408c0d614801), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026. The block is one frame recorded with kit/c64/frame.py capture, then trim, 150 seconds in,
// with the picture up: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 2 ($DD00 = $95), screen at $8C00
// and bitmap at $A000 ($D018 = $39), black background. `frame.py compare` found the drawing of it equal to VICE's
// own picture in 104,429 of its 104,448 pixels; the rest are VICE's grey dots where the loader stores to the
// border colour mid-line.
// - memory read every 25 frames from 30 seconds in: the text screen with NOW LOADING came on at 36.0 seconds,
//   the screen was blank from 76.5 while colour RAM came in, the bitmap came on whole between 80.0 and 80.5, and
//   the game's own screen replaced it between 247.5 and 248.0; the sound chip read every 10 seconds was silent
//   until the game.
// The picture's bitmap and screen colours are also the listing's bytes at $A000 and $8C00, and its colour RAM is
// the one discoveries.html carries (EN_TITLE_COLOUR): the test holds both.
// It exits 1 on any difference.
//   node games/c64/into-the-eagles-nest/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="en-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no en-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), '8c00:1000,a000:8000,bfff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,39,95');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('register writes in the frame: all to $D020, dark grey and black in turn', [F.writes.length, F.writes.every((w, i) => w[2] === 0xD020 && w[4] === (i % 2 ? 0 : 11))].join(), '80,true');
check('bitmap $A000-$BF3F', sha(mem.subarray(0xA000, 0xBF3F + 1)), 'f5838d2a58b10f8e22ea63b3c1b4aee61eed7361f19a46d1e0c099bc2d4d679b');
check('screen colours $8C00-$8FE7', sha(mem.subarray(0x8C00, 0x8FE7 + 1)), 'e10a8f8396050db07fbcb995cbe03a16f7489a72e8b91ad568ec74b93a2b888d');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '0d7237d470c58921104222fc9abfe34e68098cce73a04a93d8167bfeef66aa04');
check('the picture drawn', sha(C64.renderFrame(F).px), 'a2e737a4994bcf02e0abd6d09a8977dea2f68268c6797e84ccc9938f89e354bf');
const L = g.listing();
check('the bitmap is the listing\'s $A000-$BF3F', Buffer.compare(Buffer.from(mem.subarray(0xA000, 0xBF40)), Buffer.from(L.ram.subarray(0xA000, 0xBF40))), 0);
check('the screen colours are the listing\'s $8C00-$8FE7', Buffer.compare(Buffer.from(mem.subarray(0x8C00, 0x8FE8)), Buffer.from(L.ram.subarray(0x8C00, 0x8FE8))), 0);
const t = /const EN_TITLE_COLOUR = (\[[^\]]*\])/.exec(g.read('discoveries.html'));
check('colour RAM is discoveries.html\'s EN_TITLE_COLOUR', t && JSON.stringify([...Buffer.from(F.colour, 'base64').subarray(0, 1000)].map((c) => c & 15)) === JSON.stringify(JSON.parse(t[1])), true);
check('the page says so', ['NOW LOADING EAGLES NEST and PLEASE WAIT', 'for nearly three minutes while the game loads', 'between black and dark grey'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "into-the-eagles-nest loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
