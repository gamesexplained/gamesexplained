#!/usr/bin/env node
// Hold music.html's claim that the cassette's loading tune is the game's title tune to the cassette.
// VICE 3.10 with vice-mcp 3.14.0 loaded Ocean's 1987 cassette on 12 November 2026, the Ultimate Tape
// Archive's "Platoon_Side_1.tap" (1,723,966 bytes, SHA-256
// 44b301644775e53b478cc829acef4c16d7c6ff59a590cb4f4d8225b928270502). Its loader calls the music
// driver it loads at $E000 as the game does: $E0DE, then start_tune ($E20F) with Y = 0 from $093E,
// then play_music ($E395) once a frame from $094D. VICE stopped after each of its first 6,000 calls of
// play_music and its SID state was recorded. From the fourth call on, the registers are those the
// page's player gives for its first tune, "Jungle and village: title", from the first load's listing:
// the first three calls differ only in registers the tune has not yet written, which hold what the
// machine left there before. VICE reports the top nibble of the pulse width registers ($D403, $D40A,
// $D411) as 0, as the chip ignores it, and reports $D418's bit 3 in $D417's place, so both are left
// out. It exits 1 on any difference.
//   node games/c64/platoon/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createDriver, PLATOON_TUNES, PLATOON_ENTRY } = g.run('music.html', 'createDriver', 'createDriver', 'PLATOON_TUNES', 'PLATOON_ENTRY');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('the first tune', JSON.stringify(PLATOON_TUNES[0]), JSON.stringify(['Jungle and village: title', [0, 0]]));
check('its driver entries', PLATOON_ENTRY[0].join(), [0xE20F, 0xE395].join());
check('the page says so', /id="loading-tune"[\s\S]*?the jungle and village title tune, the first in the player above/.test(g.read('music.html')), true);

const loads = ['load1', 'load3', 'load4'].map((p) => g.listing('parts/' + p + '/listing.json').ram);
const d = createDriver({ loads, entry: PLATOON_ENTRY, tunes: PLATOON_TUNES.map((t) => t[1]) }, kit);
d.init(0);
const masked = (x) => Array.from(x.slice(0, 25), (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
const h = crypto.createHash('sha256');
for (let i = 0; i < 6000; i++) { d.play(); if (i >= 3) h.update(Buffer.from(masked(d.sid))); }
check("SID registers after the cassette's calls 4 to 6,000", h.digest('hex'), 'fc931fa3d5b0d6f0dad43938d8fb8e97a1ee0fdefda228133461549d265ce9de');

console.log(bad ? bad + ' difference(s)' : "platoon loading tune: the cassette's 6,000 calls sound as the page's title tune");
process.exit(bad ? 1 : 0);
