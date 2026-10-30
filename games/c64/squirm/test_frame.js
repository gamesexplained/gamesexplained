#!/usr/bin/env node
// The rebuilt play screen (index.html, the sq-frame widget on the sq-machine block) against VICE.
// The page runs the game's start-up from the listing on the kit's 6502 up to the first wait of the
// first pass of play ($3C56), then irq_handler ($3CB3) 95 times. Here the same block does the same,
// and the screen at $0400, colour RAM and the character set at $2800 must hash to what a frame
// recorded in VICE held (kit/c64/frame.py capture, from entry.vsf with a checkpoint on $3C56 and fire
// held on the title, 30 October 2026), and C64.renderFrame's picture of it to the picture of that
// recording, which `frame.py compare` found equal to VICE's own screenshot in all 104,448 pixels.
// The recording holds the game's memory, so it stays in work/; its hashes are below.
//   node games/c64/squirm/test_frame.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502'); g.lib('c64');
g.sameBlock('sq-machine');
const { sqMachine } = g.run('index.html', 'sq-machine', 'sqMachine');
const L = g.listing();
const VICE = {
  screen: 'c0e26cac5030458c', colour: '70e491c6dd0dc052', charset: 'db436fa2534985c6',
  picture: 'c8fbfcacb79f00598b448f43f6b31489c8309e069b54e14441673f966b36e7ec',
};
const h = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
const M = sqMachine(L.ram);
M.newGame();
for (let i = 0; i < 95; i++) M.irq();
let bad = 0;
const got = { screen: h(M.m.subarray(0x0400, 0x07E8)).slice(0, 16), colour: h(M.colour.subarray(0, 1000)).slice(0, 16),
  charset: h(M.m.subarray(0x2800, 0x3000)).slice(0, 16), picture: h(C64.renderFrame(M.frame()).px) };
for (const k of Object.keys(VICE)) if (got[k] !== VICE[k]) { bad++; console.log(`FAIL ${k}: the page's hashes to ${got[k]}, VICE's frame to ${VICE[k]}`); }
if (M.vic[0x16] !== 0xD8 || M.vic[0x18] !== 0x1A) { bad++; console.log('FAIL: the game did not set $D016 = $D8 and $D018 = $1A'); }
if (bad) { console.log(`test_frame: ${bad} failed`); process.exit(1); }
console.log('test_frame: the screen, colour RAM, character set and picture are those of the frame recorded in VICE');
