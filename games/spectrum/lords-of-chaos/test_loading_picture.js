#!/usr/bin/env node
// Hold graphics.html's loading picture (the block lc-loading and the screen in lc-l-data) to the tape,
// TOSEC's "Lords of Chaos (1990)(Blade)(Side A).tzx" (40,467 bytes, SHA-256
// b81cb43e870d716d2620a42f5203de4cc1726f64d2372219cc82eeaee6cfc0d1):
// - the picture is the headerless block with flag byte 200, block 6 of the file, at the ROM's speed;
//   its 6,912 bytes must hash as below;
// - ZEsarUX 13.0, loading the tape at its own speed on 12 November 2026 with its screen memory read every
//   10 frames, showed a black screen while the block loaded, which ends 68.2 seconds into the tape by
//   the TZX's timings (42.0 seconds after its first byte), and then the picture whole, 6,468 bytes of
//   the screen changed between one read and the next; its saved screen then matched the page's drawing
//   in all 49,152 pixels.
// It exits 1 on any difference.
//   node games/spectrum/lords-of-chaos/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('spectrum');
const { LC_LOADING } = g.run('graphics.html', 'lc-loading', 'LC_LOADING');
const S = globalThis.Spectrum;
const D = JSON.parse(g.read('graphics.html').match(/<script type="application\/json" id="lc-l-data">([^<]*)<\/script>/)[1]);
const pic = S.unbase64(D.picture);
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('picture', sha(pic), 'a6ac1b4835892f0390c88879f1c9064bec7d1ca442fc0c6f5a0c658882427edb');
check('seconds to load at the ROM\'s speed', (S.tapeTimes(pic, 855, 1710)[6911] / 3.5e6).toFixed(1), '42.0');
const ram = new Uint8Array(0x10000); ram.set(pic, 0x4000);
check('the whole picture', sha(S.screenPixels(ram, { borderColour: LC_LOADING.borderColour }).data), '90e421ab1236d17d84ed5c119b4d1dcf8f7a80d79e5d182bd35df06c4aad5d0d');

console.log(bad ? bad + ' difference(s)' : "lords-of-chaos loading picture: the tape's picture, as the loader copies it to the screen");
process.exit(bad ? 1 : 0);
