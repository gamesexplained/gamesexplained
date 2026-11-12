#!/usr/bin/env node
// Hold graphics.html's title screen (the blocks dw-loading-data and dw-loading) to the disk. The block
// dw-loading-data is one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then
// trim) on 12 November 2026 from Micro Power's 1986 disk, the C64 Preservation Project's
// "doctor_who_and_the_mines_of_terror[micro-power_1986](pal).g64" (286,164 bytes, SHA-256
// dde0ed338262c0e35ac082b5a4f1e14bb834d29e867435721d4ecb3c53f20115), with its screen and colour RAM as
// memory held them 18 seconds in: memory read every 10 frames from 4 seconds in showed this screen whole
// from about 9.4 seconds, with the second line empty, until the program printed LOAD A SAVED POSITION
// (Y/N)? there at about 19 seconds. `frame.py compare` found the drawing of the frame equal to VICE's
// own picture of it in every pixel outside that line. The disk is not in the repository, so the test
// holds the page to the recording by its hashes:
// - the video chip as the disk sets it: text ($D011 = $1B, $D016 = $C8) in bank 0 ($DD00 = $C7), screen
//   at $0400 and characters from the character ROM ($D018 = $15), a black border on a blue background,
//   and no writes in the frame;
// - the screen and colour RAM by their hashes, and the second line empty;
// - the characters of the ROM the page carries: those on the screen and no others, 480 bytes of
//   Commodore's 901225-01, each at its own offset;
// - the screen drawn by its hash.
// It exits 1 on any difference.
//   node games/c64/doctor-who-and-the-mines-of-terror/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { dwFont } = g.run('graphics.html', 'dw-loading', 'dwFont');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="dw-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no dw-loading-data block'); process.exit(1); }
const F = dwFont(JSON.parse(m[1]));
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '1b,c8,15');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,6');
check('$DD00', F.cia2[0], 0xC7);
check('register writes in the frame', F.writes.length, 0);
check('screen $0400-$07E7', sha(mem.subarray(0x400, 0x7E8)), '7c173c56b0faea5eea8c786705d527d674b5d12e8a27e9a293778b0a99f46753');
check('the second line is empty', mem.subarray(0x428, 0x450).every((x) => x === 0x20), true);
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), 'cb010427dda55ce4d335616083ef9855bb1440c3ebe3b58c2b229dc70bf722c6');
check('ROM', F.rom_excerpt.rom, 'chargen 901225-01');
const ex = [], offs = [];
for (const r of F.rom_excerpt.ranges) { const b = Buffer.from(r.b, 'base64'); ex.push(...b); for (let i = 0; i < b.length; i += 8) offs.push(r.a + i); }
check('ROM bytes', sha(Buffer.from(ex)), '010fd9c13ccff2c19f80eec3ab449be876c1b1b6ae3d88a0b67765378e4e91f3');
const want = [...new Set(mem.subarray(0x400, 0x7E8))].sort((a, b) => a - b).map((x) => x * 8);
check('ROM characters: those shown, and no others', offs.sort((a, b) => a - b).join(), want.join());
check('the screen', sha(C64.renderFrame(F).px), '506191143b9660e3bc8a4c45ba9935923087bec036ed820015a37a6df14a1011');

console.log(bad ? bad + ' difference(s)' : "doctor who title screen: the page's screen is the one recorded from the disk, and carries only the ROM's characters it shows");
process.exit(bad ? 1 : 0);
