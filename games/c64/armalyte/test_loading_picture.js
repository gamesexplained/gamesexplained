#!/usr/bin/env node
// Hold graphics.html's loading picture (the block ar-loading-data) to the cassette, Thalamus's 1988 tape, the
// Ultimate Tape Archive's "Armalyte_Side_1.tap" (395,637 bytes, SHA-256
// 1116f44d75d91cf8e7ef2d908eb8556c4080c74a55bb60c75f2872c7e22eb3a9), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026. The block is one frame recorded with kit/c64/frame.py capture, then trim, 150 seconds in,
// with the picture up: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3 ($DD00 = $C0), screen at $CC00
// and bitmap at $E000 ($D018 = $39), black border and background. The frame's one register write, sprite 7's
// colour with every sprite off, is left out. `frame.py compare` found the drawing of it equal to VICE's own
// picture in all 104,448 pixels.
// - the video chip and sound chip read every 10 frames: the tune started at 53.0 seconds, over a text screen,
//   the bitmap came on at 99.6, the sound ended at 212.0 and the screen went blank at 218.0;
// - the tune is the engine's tune 1, the demo's: the loader's copy of the music driver ($B000, $B059), run from
//   its init in the kit's 6502 simulator, gave the same SID registers as the engine's tune 1 ($C000, $C059) in
//   all 26,000 frames once the variable init leaves alone ($B525, engine $C525) held the same value in both;
// - the disk the listing comes from, the C64 Preservation Project's armalyte_s1[thalamus_1988](pal)(!).g64
//   (325,814 bytes, SHA-256 33f6bed52e540a0424c4fbfa81598df324a88fac2209e1a64d8673b3170dc2a2), with 2 pressed
//   at its menu, showed the same bitmap, screen and colour bytes from bank 1 ($D018 = $81, $DD00 = $C2), with
//   the same driver playing the same tune: the test holds the page to those bytes' hashes, the disk's as well.
// It exits 1 on any difference.
//   node games/c64/armalyte/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="ar-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no ar-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'cc00:1000,e000:8000,ffff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,39,c0');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('no register written during the frame', F.writes.length, 0);
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF3F + 1)), '93f879c68a1adce9577978866e01e59764973320f8090aa2953131fbae409453');
check('screen colours $CC00-$CFE7', sha(mem.subarray(0xCC00, 0xCFE7 + 1)), 'cfd2073bb75e46ea9a37ad5e4d480068f8ed76ea4c2d8fa97f4f3d041df3598c');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '92d915ed54086334df43a85a06fa64b2f301e432bd4aab968ae8580760941ebe');
check('the picture drawn', sha(C64.renderFrame(F).px), '1e105d7d7766bfb29fa75d06e5edc3fa57e20c73dcfc2fd62e0ca0f59033f1e2');
check('the page says so', ['53 seconds into the tape it starts a tune', 'the picture comes up whole', 'the one it plays for its demo', 'the same in every pixel, with the same tune'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "armalyte loading picture: the page's picture is the frame recorded from the tape");
process.exit(bad ? 1 : 0);
