#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks th-loading-data and th-loading) to the cassette, Firebird's
// 1986 tape, the Ultimate Tape Archive's "Thrust.tap" (431,186 bytes, SHA-256
// de97fc1c48faa5427984cc10ae0cff3edf08bd9e85fa3dc3335997591da729ee), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026:
// - D.frame is one frame recorded with kit/c64/frame.py capture, then trim, 150 seconds in, with the picture up:
//   a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3 ($DD00 = $94), screen at $DC00 and bitmap at $E000
//   ($D018 = $79), black background, and no register written during the frame, so the border is one colour.
//   `frame.py compare` found the drawing of it equal to VICE's own picture in all 104,448 pixels;
// - D.steps and D.frames: the border colour and the video chip's mode read every frame from 110 seconds in. The
//   bitmap screen came on at frame 5,638 (112.8 seconds) with a black border and went off at frame 12,919, 7,281
//   frames later, and in between the border took a new colour 91 times, each the next of the sixteen;
// - memory read every 25 frames from 60 seconds in showed the text screen with LOADING and a count before it,
//   the picture whole from its first sample, and no byte of it changed while it was up; the sound chip read
//   every 10 seconds was silent until the game;
// - Firebird's disk, the C64 Preservation Project's thrust[firebird_1986](pal).g64, read 40 seconds in, holds the
//   same bitmap, screen colours and colour RAM in every byte, at the same addresses;
// - the crack these pages describe shows the picture (reference/title-loading-picture.png) with 1,742 of the
//   64,000 pixels inside the border different, mapped to the nearest of the palette's colours: the cells of TCI
//   under the title and of the boxed signature, and 22 cells of the ship and the pod in one colour.
// It exits 1 on any difference.
//   node games/c64/thrust/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };
const { lpAt } = g.run('graphics.html', 'th-loading', 'lpAt');

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="th-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no th-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]), F = D.frame;
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'dc00:1000,e000:8000,ffff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,79,94');
check('border, background, writes', [F.vic[0x20] & 15, F.vic[0x21] & 15, F.writes.length].join(), '14,0,0');
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), '1b50501e43db335ba74b48458300d3eba8fadfd2851f09e898224aec58130883');
check('screen colours $DC00-$DFE7', sha(mem.subarray(0xDC00, 0xDFE8)), 'f5c2a2ab788376dafbace15b7f0f41f959aa83febf00905383748364666c57bf');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '353c38352a855c80f4ecb0793a76493228541b5fab5ef7af26effac91e77ec46');
check('the picture drawn', sha(C64.renderFrame(F).px), 'bc69211510ac9453d9da9540c0fe777b96d342c4704fa0cfd0e2d048338d14fe');

check('the border as recorded', sha(Buffer.from(JSON.stringify(D.steps))), '4dac86008a5e2415b1d0aaf2e1dd6255021443412bacbe89532a895fdf653fa9');
check('frames the picture is up', D.frames, 7281);
check('new colours', D.steps.length - 1, 91);
check('black when the picture comes up, then each the next colour', D.steps[0].join() + '|' + D.steps.every(([, c], i) => !i || c === ((D.steps[i - 1][1] + 1) & 15)), '0,0|true');
check('lpAt: the colour at the start, between and at the end', [lpAt(D, 0).border, lpAt(D, 906).border, lpAt(D, 907).border, lpAt(D, D.frames).border].join(), '0,0,1,11');

check('the page says so', ['Then, 113 seconds in, it puts up its picture whole', 'for nearly two and a half minutes', 'the border changes 91 times',
  'counts the blocks of the tape as they come in, in hexadecimal', "Firebird's disk shows the same picture, byte for byte"]
  .filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "thrust loading picture: the page's picture and its border are the ones recorded from the tape");
process.exit(bad ? 1 : 0);
