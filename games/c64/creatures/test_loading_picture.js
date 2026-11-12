#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks cr-loading-data and cr-loading) to the cassette. The block
// cr-loading-data is one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then
// trim) on 12 November 2026, 60 seconds into Thalamus's 1990 cassette, side 1, the Ultimate Tape Archive's
// "Creatures_Side_1.tap" (636,691 bytes, SHA-256
// 7e2d1b29c6af4b54ffa01461cbef32a9b9ad626b8f1c055989c923c8d700d668). `frame.py compare` found the drawing of
// the frame equal to VICE's own picture of it in all 104,448 pixels, and the drawing with only the ROM's
// characters the page carries is the same picture. Memory read every 5 frames from 36 seconds in showed the
// loader's banner, CYBERLOAD NOW LOADING FLUFFY THANGS, then the screen and colour RAM of this picture
// written between two reads at 52.8 and 52.9 seconds, and no change to either up to 76 seconds; read every
// 10 seconds, the picture was up at 220 seconds and gone at 230, and the sound chip's volume was 0 at
// every read until then. The tape is not in the repository, so the test holds the page to the recording by
// its hashes:
// - the video chip as the tape sets it: text ($D011 = $1B, $D016 = $C8) in bank 0 ($DD00 = $97), screen
//   at $0400 and characters from the character ROM ($D018 = $15), black border and background, and one
//   write in the frame, to a sprite's colour ($D02E), with no sprite on;
// - the screen and colour RAM by their hashes, and the list down the side, its first letters in cyan;
// - the characters of the ROM the page carries: those on the screen and no others, 296 bytes of
//   Commodore's 901225-01, each at its own offset;
// - the screen drawn by its hash.
// It exits 1 on any difference.
//   node games/c64/creatures/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { crFont } = g.run('graphics.html', 'cr-loading', 'crFont');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="cr-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no cr-loading-data block'); process.exit(1); }
const F = crFont(JSON.parse(m[1]));
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
const colour = Buffer.from(F.colour, 'base64');
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '1b,c8,15');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('$DD00', F.cia2[0], 0x97);
check('register writes in the frame', F.writes.map((w) => w[2].toString(16)).join(), 'd02e');
check('sprites on', F.vic[0x15], 0);
check('screen $0400-$07E7', sha(mem.subarray(0x400, 0x7E8)), '060f3b54c6efbd3839b1acde28577f92f823bc880dc1f12cb272509a7e1bac5d');
check('colour RAM', sha(colour.subarray(0, 1000)), 'af943bd03f6723ad29737ee7b4e7237a543f8af7bd6eb4e8d9973fae546a42f5');
const text = (row, from, to) => Array.from(mem.subarray(0x400 + row * 40 + from, 0x400 + row * 40 + to), (c) => (c >= 1 && c <= 26 ? String.fromCharCode(64 + c) : String.fromCharCode(c))).join('').trim();
const list = [6, 7, 8, 9, 10, 11, 12, 13, 14].map((r) => text(r, 28, 40));
check('the list down the side', list.join(' '), 'CLYDE RADCLIFFE EXTERMINATES ALL THE UNFRIENDLY REPULSIVE EARTH-RIDDEN SLIME');
check('its first letters', list.map((w) => w[0]).join(''), 'CREATURES');
check('their colour, and the rest of each word\'s', [6, 7, 8, 9, 10, 11, 12, 13, 14].map((r) => (colour[r * 40 + 28] & 15) + '/' + (colour[r * 40 + 29] & 15)).join(), Array(9).fill('3/14').join());
check('ROM', F.rom_excerpt.rom, 'chargen 901225-01');
const ex = [], offs = [];
for (const r of F.rom_excerpt.ranges) { const b = Buffer.from(r.b, 'base64'); ex.push(...b); for (let i = 0; i < b.length; i += 8) offs.push(r.a + i); }
check('ROM bytes', sha(Buffer.from(ex)), '39018b128d2d914ae6cfdd1e31bf55880677177d80a1488599ebdef0b1f5fb8b');
const want = [...new Set(mem.subarray(0x400, 0x7E8))].sort((a, b) => a - b).map((x) => x * 8);
check('ROM characters: those shown, and no others', offs.sort((a, b) => a - b).join(), want.join());
check('the screen', sha(C64.renderFrame(F).px), 'fb2d965ce9db2f8b3e99965b3df98b314b5cf58f1d113519fcc97b8b08835d73');
check('the page says so', ['CYBERLOAD NOW LOADING FLUFFY THANGS', '53 seconds in, it puts up its picture whole', 'only the 37 characters the screen shows, 296 bytes'].filter((s) => !page.includes(s)).join(), '');

console.log(bad ? bad + ' difference(s)' : "creatures loading picture: the page's screen is the one recorded from the tape, and carries only the ROM's characters it shows");
process.exit(bad ? 1 : 0);
