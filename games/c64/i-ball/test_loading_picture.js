#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks ib-loading-data and ib-loading) to the cassette, Firebird's
// 1987 tape, the Ultimate Tape Archive's "I_Ball.tap" (599,130 bytes, SHA-256
// d650d048ca79c5ffe5c8495f5e94254cfd494adb67d382c8cfd07def2c528699), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026:
// - D.frame is one frame recorded with kit/c64/frame.py capture, then trim, 180 seconds in, with the picture
//   up: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3 ($DD00 = $94), screen at $D000 and bitmap
//   at $E000 ($D018 = $49), black background, and no register written during the frame, so the border is one
//   colour. `frame.py compare` found the drawing of it equal to VICE's own picture in all 104,448 pixels;
// - D.steps, D.row, D.text and D.frames: the border colour, the video chip's mode and the bitmap's last 64
//   bytes ($FF00-$FF3F) read every 2 frames from 174 seconds in. The bitmap screen came on at frame 8,854 (177.1 seconds)
//   and went at frame 16,312, 7,458 frames later, when the game's own screen came up. In between, the
//   loader stored the screen codes of SEARCHING at $FF28, then those of LOADING and a count at $FF02 and
//   spaces over SEARCHING, then each new count at $FF0A-$FF0B, with the border moving on one colour with
//   each; the count ran from 00 to 6C, then SEARCHING was printed again, and the count ran from 00 again to 12;
// - memory read every 5 frames on another load, from 160 seconds in, showed the same LOADING and count on
//   the text screen at $0400 before the picture, and nothing else on screen changing after it; a frame
//   recorded 323 seconds in differs from the one at 180 seconds only at $FF0A, the count's first digit;
// - the sound chip read every 25 frames from the start of the tape was silent until 324.5 seconds in, when
//   the game's screen had come up.
// It exits 1 on any difference.
//   node games/c64/i-ball/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { lpAt } = g.run('graphics.html', 'ib-loading', 'lpAt');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="ib-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no ib-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]), F = D.frame;
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'd000:1000,e000:8000,ffff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '3b,d8,49,94');
check('border, background, writes', [F.vic[0x20] & 15, F.vic[0x21] & 15, F.writes.length].join(), '2,0,0');
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), '51d19d328fa7c43925f46d2bf76363f22c86c69d346fc55f9adee599be1ec4cd');
check('screen colours $D000-$D3E7', sha(mem.subarray(0xD000, 0xD3E8)), 'a646db2fc0133b7e86efae09929739ec512f388c230f1b93d62ae384d608302d');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '4556f2ff9c16621cae12ea588c4155df1e0fcf16f6a5b0616bb52eb62f3f3b2a');
check('the picture drawn', sha(C64.renderFrame(F).px), 'ab050746597b3ce93c928154c9ecfdb5c7ba8fd8bd03f64bba81770be39fbc98');

// the recorded load, and what lpAt makes of it
check('the border as recorded', sha(Buffer.from(JSON.stringify(D.steps))), '1dad10a88a08aac3acbafeae1def2a97591bb39bd3c5d605556f724d4a18a24e');
check('the corner as recorded', sha(Buffer.from(D.row + JSON.stringify(D.text))), 'de5852ee91206d697e939233e1b3e3470f6306192c221a1a8b3e538c8d9ad757');
check('frames the picture is up', D.frames, 7458);
check('each border the next colour', D.steps.every(([, c], i) => !i || c === ((D.steps[i - 1][1] + 1) & 15)), true);
const say = (row, a, b) => row.slice(a, b).map((v) => (v >= 1 && v <= 26 ? String.fromCharCode(64 + v) : String.fromCharCode(v))).join('');
const at = (k) => lpAt(D, k).row;
check('the picture as it arrives: $FF02-$FF0B', Buffer.from(at(0).slice(2, 12)).toString('hex'), Buffer.from(D.row, 'hex').subarray(2, 12).toString('hex'));
check('then SEARCHING', say(at(D.text[0][0]), 0x28, 0x31), 'SEARCHING');
check('then LOADING 00, with spaces over SEARCHING', [say(at(D.text[1][0]), 2, 12), say(at(D.text[1][0]), 0x28, 0x35)].join('|'), 'LOADING 00|' + ' '.repeat(13));
const counts = D.text.filter(([, o, h]) => o <= 11 && o + h.length / 2 > 10).map(([f]) => say(at(f), 10, 12));
const searching = D.text.filter(([, o, h]) => o === 0x28 && h.startsWith('13')).map(([f]) => f);
check('SEARCHING twice: as the picture arrives, and for three seconds between the counts', [searching.length, searching[0], Math.round((D.text.find(([f, o]) => f > searching[1] && o === 10)[0] - searching[1]) / 50)].join(), '2,8,3');
check('the counts: 00 to 6C, then 00 to 12', [counts.length, counts[0], counts[108], counts[109], counts[127]].join(), '128,00,6C,00,12');
check('the frame at 180 seconds is the recorded corner at one of its counts', D.text.some(([f]) => Buffer.compare(Buffer.from(at(f)), Buffer.from(mem.subarray(0xFF00, 0xFF40))) === 0), true);
check('the corner at the end', say(at(D.frames), 2, 12), 'LOADING 12');

check('the page says so', ['Then, 177 seconds in, it puts up its picture whole', 'for two and a half minutes, until the game starts',
  'prints SEARCHING into its bottom right corner', 'The count runs up to 6C, SEARCHING comes back for three seconds, and the count starts again at 00 for the last part of the game and reaches 12']
  .filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "i-ball loading picture: the page's picture, border and spoiled corner are the ones recorded from the tape");
process.exit(bad ? 1 : 0);
