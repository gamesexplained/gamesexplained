#!/usr/bin/env node
// Hold graphics.html's loading picture (the block cm-loading-data) to Domark's 1990 disk, the C64 Preservation
// Project's castle_master[domark_1990](!).g64 (365,464 bytes, SHA-256
// ddde6738a53838193b75849030d6b5364757c9de273d6a2c9fe9c81a68177d9f), the disk the listing comes from, loaded in
// VICE 3.10 with vice-mcp 3.14.0 on 12 November 2026. The block is one frame recorded with kit/c64/frame.py
// capture, then trim, 60 seconds after the disk started, with the picture up: a multicolour bitmap ($D011 = $3B,
// $D016 = $D8) in bank 3 ($DD00 = $24), screen at $C400 and bitmap at $E000 ($D018 = $1D), black background and
// border, and no register written during the frame. `frame.py compare` found the drawing of it equal to VICE's
// own picture in all 104,448 pixels.
// - memory read every 5 frames from the start: the screen was blank from 4.3 seconds while the bitmap and its
//   colours came in, and came on with the picture whole between 31.0 and 31.1 seconds;
// - the video chip read every 25 frames: the picture stayed until the screen went blank at 172.0 seconds, and
//   stores to the sound chip, counted every 25 frames from 25 seconds in, were none but one clearing of all its
//   registers at 164 seconds until the title tune began at 199;
// - the cassette, the Ultimate Tape Archive's "Castle_Master.tap" (519,894 bytes, SHA-256
//   e3db61844b2d93683ca68b4ae2feaa4187ac792c3a05b938cac4425f3bab2047), read every 10 seconds, showed the
//   KERNAL's own messages, then the loader's stripes from 40 to 280 seconds, then the language menu.
// It exits 1 on any difference.
//   node games/c64/castle-master/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="cm-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no cm-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'c400:1000,e000:8000,ffff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,1d,24');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('no register written during the frame', F.writes.length, 0);
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF3F + 1)), 'f657261d98350a3cdab59d0ec870065aa4d721ff43564739873b1c5bdd85e095');
check('screen colours $C400-$C7E7', sha(mem.subarray(0xC400, 0xC7E7 + 1)), '821d2f12103ef51d7508bc47a91fcfe051ddfff951cb24db80f59d05fa783e5b');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), 'a94657b87b72cb2edda0bde9f2f4d9fe0b3a3bb96eba13ceab73089b65e3de16');
check('the picture drawn', sha(C64.renderFrame(F).px), 'abf3445b37212a4398a823abb397357da807f3ab7f539c444c5f6bd271e0cbfd');
check('the page says so', ['puts it up whole, 31 seconds after the disk starts', 'for two and a third minutes while the game loads', 'Domark\'s cassette shows no picture'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "castle-master loading picture: the page's picture is the frame recorded from the disk");
process.exit(bad ? 1 : 0);
