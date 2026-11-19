#!/usr/bin/env node
// Hold what index.html says of the cassette's tune to the cassette: the tune it plays while it loads is the
// Music tab's first, The menu. Mirrorsoft's 1989 tape, the Ultimate Tape Archive's "Speedball.tap" (507,239
// bytes, SHA-256 a761db0f63e8019ce967688ae3061a918d554785ad278ac2a8baa6d30e7565d3), was loaded in VICE 3.10
// with vice-mcp 3.14.0 on 12 November 2026:
// - the tape's tune is the game's own sound driver: of the listing's bytes at $0810-$1B8F, the tape holds
//   4,191 the same $9800 higher, 625 more moved on by $98 (the high bytes of addresses), 82 that name a
//   zero-page pointer at $FE where the game's is at $F0, and 94 others: 90 in the driver's variables
//   (between $08D0 and $12E4, and the random generator's four bytes at $131A-$131D) and 4 in music_stop_all
//   ($12E5-$12ED), which loads and stores with X where the game's uses A; its loader calls the driver's start ($A010, the game's music_init at $0810), and its
//   play routine ($A147, the game's $0947) from an interrupt;
// - VICE stopped after each of 8,000 of those calls and its SID state was recorded. From the driver's start
//   as the second picture comes up, the 6,089 calls recorded (two minutes) are, register for register, the
//   page's player (the block sb-music, createDriver) for The menu, from its start;
// - the SID's volume and gates read every 25 frames: sound from 126.0 seconds into the tape to 282.5, when
//   the screen goes off before the game starts, about two and a half minutes.
// VICE reports the top nibble of the pulse width registers ($D403, $D40A, $D411) as 0, as the chip ignores
// it, and reports $D418's bit 3 in $D417's place, so both are left out.
// It exits 1 on any difference.
//   node games/c64/speedball/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createDriver, SB_TUNES, SB_DRIVER_RANGES, SB_HUM } = g.run('index.html', 'sb-music', 'createDriver', 'SB_TUNES', 'SB_DRIVER_RANGES', 'SB_HUM');
const L = g.listing();
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('the first tune', SB_TUNES[0].name + ':' + SB_TUNES[0].tune, 'The menu:0');
const drv = createDriver({ mem: SB_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]), tunes: SB_TUNES, hum: SB_HUM }, kit);
drv.init(0);
const sid = new Uint8Array(25), h = crypto.createHash('sha256');
const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
for (let i = 0; i < 6089; i++) {
  drv.play();
  const w = drv.writes;
  for (let k = 0; k < w.length; k += 2) sid[w[k]] = w[k + 1];
  h.update(Buffer.from(masked(sid)));
}
check('SID registers, 6,089 calls, as VICE recorded the cassette\'s', h.digest('hex'), '9afb945286a7c198b7378c69ff9a6eb555aa262d0c4502f61820f3b6aa466c6c');
check('still playing', drv.playing(), true);
const page = g.read('index.html');
check('the page says so', ['The cassette plays the menu tune while it loads', 'keeps it going for two and a half minutes'].filter((s) => !page.includes(s)).join(), '');

console.log(bad ? bad + ' difference(s)' : "speedball loading tune: the cassette's tune is the Music tab's The menu, call for call");
process.exit(bad ? 1 : 0);
