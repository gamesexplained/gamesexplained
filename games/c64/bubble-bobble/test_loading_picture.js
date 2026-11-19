#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks bb-loading-data and bb-loading) to the cassette, Firebird's
// 1987 tape, the Ultimate Tape Archive's "Bubble_Bobble.tap" (763,833 bytes, SHA-256
// 017a1d6efa5c4a0b3a5a879ae0ca6f0f29c7c0f1ead9e0013c196e67372fb732), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026:
// - D.frame is one frame recorded with kit/c64/frame.py capture, then trim, 220 seconds in, with the picture
//   up: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 0 ($DD00 = $97), screen at $0C00 and bitmap
//   at $2000 ($D018 = $39), black background, and no register written during the frame, so the border is one
//   colour. `frame.py compare` found the drawing of it equal to VICE's own picture in all 104,448 pixels;
// - D.steps and D.frames: the border colour and the video chip's mode read every 2 frames from 194 seconds
//   in. The bitmap screen came on at frame 9,846 (196.9 seconds) and the screen went blank at frame 16,634,
//   6,788 frames later, and in between the border took a new colour 119 times, each the next of the sixteen;
// - memory read every 5 frames on another load, from 180 seconds in, showed the text screen at $0400 with
//   LOADING and a count in hexadecimal on it in white (colour RAM 1), going from $58 to $62, and the border
//   moving on one colour for each step of the count, a little ahead of it;
// - the sound chip read every 25 frames from the start of the tape was silent until 400 seconds in.
// It exits 1 on any difference.
//   node games/c64/bubble-bobble/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { lpAt } = g.run('graphics.html', 'bb-loading', 'lpAt');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="bb-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no bb-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]), F = D.frame;
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'c00:1000,2000:8000,3fff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,39,97');
check('border, background, writes', [F.vic[0x20] & 15, F.vic[0x21] & 15, F.writes.length].join(), '4,0,0');
check('bitmap $2000-$3F3F', sha(mem.subarray(0x2000, 0x3F40)), '08637b6b56d53d964c39bdb7d1ba1ca65b850cd6a1e1f4cbef2b72d91f416e51');
check('screen colours $0C00-$0FE7', sha(mem.subarray(0x0C00, 0x0FE8)), '8e66d0e2e82e36154813171f16506f0064347a27e17854301a850ff3d274f8a0');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '6c31ec2a3def51bd7f8388e52e91a0954a030c81d6548c2571441618525a24fc');
check('the picture drawn', sha(C64.renderFrame(F).px), 'e554b8baec3f2a88f7971d16f011681804a8d2a49f02dce741c8c4f22308f3b4');

check('the border as recorded', sha(Buffer.from(JSON.stringify(D.steps))), 'e383d870a60a5cdafe47f811d444b563898c388540236b5a3b9cf250e7b3e9ab');
check('frames the picture is up', D.frames, 6788);
check('new colours', D.steps.length - 1, 119);
check('each the next colour', D.steps.every(([, c], i) => !i || c === ((D.steps[i - 1][1] + 1) & 15)), true);
const gaps = D.steps.slice(2).map(([f], i) => f - D.steps[i + 1][0]);
check('about once a second after the first', gaps.every((n) => n >= 40 && n <= 75) && Math.round(gaps.reduce((a, b) => a + b) / gaps.length / 5) * 5, 55);
check('lpAt: the colour at the start, between and at the end', [lpAt(D, 0).border, lpAt(D, 141).border, lpAt(D, 142).border, lpAt(D, D.frames).border].join(), '0,0,1,7');

check('the page says so', ['Then, 197 seconds in, it puts up its picture whole', 'for two and a quarter minutes', 'the border changes 119 times', 'counts the blocks of the tape as they come in, in hexadecimal']
  .filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "bubble-bobble loading picture: the page's picture and its border are the ones recorded from the tape");
process.exit(bad ? 1 : 0);
