#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks cm-loading-data and cm-loading) to the cassette.
// The block cm-loading-data is one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py
// capture, then trim) on 11 November 2026, 120 seconds into Elite's 1985 cassette, the Ultimate Tape
// Archive's "Commando.tap" (606,572 bytes, SHA-256
// 042aedeb656e07143ace7d7b3b5db92f5671c37eb09c1530faf8e5f69dd7d8d2). `frame.py compare` found
// C64.renderFrame's drawing of it equal to VICE's picture in 104,422 of 104,448 pixels; the other 26
// are the clock's last digit, which the tape changed while the frame was drawn. The tape is not in
// the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: text ($D011 = $1B, $D016 = $C8) in bank 0 ($DD00 = $97),
//   screen at $0400 and characters from the character ROM ($D018 = $15), a black border and
//   background, and no writes in the frame;
// - the screen and colour RAM by their hashes, and the characters of the ROM the page carries: those
//   on the screen and the ten digits, and no others, 640 bytes of Commodore's 901225-01;
// - the counters: VICE read the screen's row of counters ($0518-$053F) in every frame from 42 seconds
//   into the tape to 330. It showed 206 blocks and 0:00:00 from frame 2,119, the clock gaining two
//   hundredths a frame from frame 2,123 to 3:15:00 at frame 11,872, and the blocks falling one at a
//   time, to 000 at frame 11,673. CM_BLOCKS holds when each went, counted from frame 2,119, and the
//   page's frame 3,899 must be the recorded frame, with 124 blocks and 1:17:92;
// - the drawings of the cabinet as it comes up and as it is left.
// It exits 1 on any difference.
//   node games/c64/commando/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { cmLoadingFrame, cmFont, cmCounters, CM_BLOCKS, CM_END } = g.run('graphics.html', 'cm-loading', 'cmLoadingFrame', 'cmFont', 'cmCounters', 'CM_BLOCKS', 'CM_END');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="cm-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no cm-loading-data block'); process.exit(1); }
const F = cmFont(JSON.parse(m[1]));
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].join(), '27,200,21');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
check('$DD00', F.cia2[0], 0x97);
check('register writes in the frame', F.writes.length, 0);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('screen $0400-$07E7', sha(mem.subarray(0x400, 0x7E8)), '5baa6a38054344df6d628085af330201d9ea05decbb3fa1afc5943bd1794f10c');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '871f9ac0b6743c34b74c8d75bad31c484557fad6bbd43098652b43bef4468fe5');

check('ROM', F.rom_excerpt.rom, 'chargen 901225-01');
const ex = [], offs = [];
for (const r of F.rom_excerpt.ranges) { const b = Buffer.from(r.b, 'base64'); ex.push(...b); for (let i = 0; i < b.length; i += 8) offs.push(r.a + i); }
check('ROM bytes', sha(Buffer.from(ex)), '0ec95e6f4cea7d3b63fdc4cc7a687e127a92e9692413f71e2997281c165c79d9');
const want = [...new Set([...mem.subarray(0x400, 0x7E8), ...'0123456789:'.split('').map((c) => c.charCodeAt(0))])].sort((a, b) => a - b).map((c) => c * 8);
check('ROM characters: those shown and the digits, and no others', offs.sort((a, b) => a - b).join(), want.join());

check('blocks: 206 of them, from frame 39 to 9,554', [CM_BLOCKS.length, CM_BLOCKS[0], CM_BLOCKS[205]].join(), '206,39,9554');
check('blocks: in order', CM_BLOCKS.every((v, i) => !i || v > CM_BLOCKS[i - 1]), true);
check('blocks', sha(Buffer.from(JSON.stringify(CM_BLOCKS))), '633219c172d3910f2932a281c0c9f890a180813db99865a21bfd3af5d3fd2494');
check('counters as the cabinet comes up', cmCounters(0).join(), '206,0');
check('counters at frame 4', cmCounters(4).join(), '206,2');
check('counters as the last block goes', cmCounters(9554).join(), '0,19102');
check('counters at the end', [cmCounters(CM_END).join(), cmCounters(CM_END + 500).join()].join(' '), '0,19500 0,19500');
const rec = sha(C64.renderFrame(F).px);
check('the recorded frame', rec, 'd36cc83554b9ead657b4bab31ccff9c2124a84ed3a8e9285275a8b86d8ef9dcb');
check('frame 3,899 is the recorded one', sha(C64.renderFrame(cmLoadingFrame(F, mem, 3899)).px), rec);
check('the cabinet as it comes up', sha(C64.renderFrame(cmLoadingFrame(F, mem, 0)).px), 'd5a8e9e8970aa60dc852c62c521b57ecefa56914a8e901a2722a58486cac9529');
check('the cabinet as it is left', sha(C64.renderFrame(cmLoadingFrame(F, mem, CM_END)).px), 'dc7ec5eee47d4da6105c8787c8c5d66e4644fb5cfd361231ee70b77d873634d8');

console.log(bad ? bad + ' difference(s)' : "commando loading picture: the page's frame is the one recorded from the tape, and its counters run as the tape's did");
process.exit(bad ? 1 : 0);
