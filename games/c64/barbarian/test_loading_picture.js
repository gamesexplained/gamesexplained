#!/usr/bin/env node
// Hold graphics.html's loading picture (the block bb-loading-data) to the cassette, Palace Software's 1987
// tape, the Ultimate Tape Archive's "Barbarian-_The_Ultimate_Warrior_Side_1.tap" (702,135 bytes, SHA-256
// dea90f0bc5228fa92e9d5ea8fee197a5e44e43a48be5fbf08fffdf5d17193452), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026. The block is one frame recorded with kit/c64/frame.py capture, then trim, 150 seconds in,
// with the picture up: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 1 ($DD00 = $96), screen at $4400
// and bitmap at $6000 ($D018 = $19), black background. `frame.py compare` found the drawing of it equal to VICE's
// own picture in 104,444 of its 104,448 pixels; the rest are VICE's grey dots where the loader stores to the
// border colour mid-line, and single pixels at the edges of the border's stripes.
// - the loader's byte routine, at $05B9 while the picture is up, reads eight pulses and then adds 1 to $D020:
//   the border steps on one colour for every byte;
// - the video chip read every 5 frames from 80 seconds in: the bitmap came on whole between 95.2 and 95.3
//   seconds and the screen went blank between 319.9 and 320.0, before the game's own screen; the sound chip read
//   every 10 seconds was silent until the game;
// - the bitmap and its screen are in neither part's listing: the game does not carry the picture;
// - the disk the listing comes from, the C64 Preservation Project's barbarian_s1[palace_1987](!).g64, read
//   every 5 seconds, showed screens of one colour and stripes, then the game at 90 seconds, and no picture.
// It exits 1 on any difference.
//   node games/c64/barbarian/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="bb-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no bb-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), '4400:1000,6000:8000,7fff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,19,96');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '12,0');
check('register writes in the frame: all to $D020, each the colour after the one before', [F.writes.length, F.writes.every((w) => w[2] === 0xD020), F.writes.every((w, i) => !i || (w[4] & 15) === ((F.writes[i - 1][4] + 1) & 15))].join(), '6,true,true');
check('bitmap $6000-$7F3F', sha(mem.subarray(0x6000, 0x7F3F + 1)), 'a447b070424734945e215602ac19c837f97db9863d8ec2f0317d8263dd999a23');
check('screen colours $4400-$47E7', sha(mem.subarray(0x4400, 0x47E7 + 1)), 'd0789ab19d6945fb356c515c720a71c0c690e9b593f7a8b91713bcc6d7cae119');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '80003cf4555b4bcaf3067eaf6bc21f582a3a1f52b72a700d2e82d26e079e3db9');
check('the picture drawn', sha(C64.renderFrame(F).px), 'b718e892d80c18471461a8f626d782fd3e4a61ba19b87cb1575ddac0d903acb7');
check('the page says so', ['puts up its picture whole, 95 seconds in', 'for nearly four minutes while the game loads', 'for every byte it reads from the tape', 'shows no picture at all'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "barbarian loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
