#!/usr/bin/env node
// Hold graphics.html's loading picture (the block ls-loading and the screens in ls-l-data) to the tape,
// TOSEC's "Laser Squad (1988)(Blade)[scenario 1-2].tzx" (67,525 bytes,
// SHA-256 2cff880377ad8abde415607ce6f61418acb1035b3cc39d91965fd648af790dad):
// - the picture is the file SCREEN, block 5, at the ROM's speed: pulses of 855 T-states for a 0 and 1,710 for a 1,
//   after a flag byte of 255; the screens must hash as below;
// - the page's pace is the tape's: tapeTimes (site/lib/spectrum.js) times each byte from the picture's
//   bits and the pulse lengths, and how many bytes were in at every 69,888 T-states (one frame of the
//   machine, ten to a step) from the end of the flag byte, worked out from the TZX's own timings, must
//   hash as below, with the bitmap in 40.99 seconds after the first byte, 19.86 seconds into the
//   tape, and the colours 45.70;
// - ZEsarUX 13.0, loading the tape at its own speed on 12 November 2026 with its screen memory read every
//   10 frames, held `before` at the picture's first byte, at every read the picture's bytes up to a front
//   and `before` past it, and the picture once its last byte was in; its own saved screen then matched
//   the page's drawing in all 49,152 pixels. Its pace differed from the tape's by up to 5 per cent, as
//   it plays a tape at 15,600 samples a second, so the page takes its pace from the TZX;
// - the border, while the bytes came in, was striped blue and yellow in ZEsarUX's saved screens;
// - with the bitmap in and the colours not, only the bottom two rows of cells show anything, white on
//   black; the border was white once the load ended;
// It exits 1 on any difference.
//   node games/spectrum/laser-squad/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('spectrum');
const { LS_LOADING } = g.run('graphics.html', 'ls-loading', 'LS_LOADING');
const S = globalThis.Spectrum;
const D = JSON.parse(g.read('graphics.html').match(/<script type="application\/json" id="ls-l-data">([^<]*)<\/script>/)[1]);
const pic = S.unbase64(D.picture), before = S.unbase64(D.before);
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('picture', sha(pic), '9d31986d303f207ab6f54be03c31877086fe5f2b8179016535cf3a22c9d6a549');
check('before', sha(before), '33d3cbacb2ffbd1341cbcd5d6370168330f340e400023dc5853de914a74ab0a2');
check('pulses for a 0 and a 1', [LS_LOADING.bit0, LS_LOADING.bit1].join(), '855,1710');
check('stripes', LS_LOADING.stripes.join(), '1,6');
check('border once the picture is in', LS_LOADING.borderColour, 7);

const ends = S.tapeTimes(pic, LS_LOADING.bit0, LS_LOADING.bit1), front = [];
for (let k = 0; ; k++) { const n = S.bytesIn(ends, k * 698880); front.push(n); if (n === 6912) break; }
check('front: steps', front.length, 230);
check('front: the TZX\'s', sha(front.join(',')), 'b151c0afbf61ca80cd1f25503ae3c0c046918da25c4aa5be90c676597b900e3e');
check('seconds to the bitmap', (ends[6143] / 3.5e6).toFixed(2), '40.99');
check('seconds to the colours', (ends[6911] / 3.5e6).toFixed(2), '45.70');

for (const n of [0, 1, 3000, 6143, 6911]) {
  const R = S.partLoaded(before, pic, n);
  let wrong = 0;
  for (let i = 0; i < 6912; i++) if (R[0x4000 + i] !== (i < n ? pic[i] : before[i])) wrong++;
  check(`screen with ${n} bytes in`, wrong, 0);
}
const lit = (n) => {
  const img = S.screenPixels(S.partLoaded(before, pic, n), { border: 0 }), rows = new Set();
  for (let i = 0; i < 256 * 192; i++) if (img.data[4 * i] | img.data[4 * i + 1] | img.data[4 * i + 2]) rows.add((i >> 8) >> 3);
  return [...rows].join();
};
check('rows of cells lit before the load', lit(0), '');
check('rows of cells lit with the bitmap in', lit(6144), '22,23');
check('the whole picture', sha(S.screenPixels(S.partLoaded(before, pic, 6912), { borderColour: LS_LOADING.borderColour }).data), '4ef5c2259921cc1a68c01ef7e06ed2b5d05e9fcb12e1058c141157f60cbf6d59');
check('the player\'s last frame', sha(S.loadingPixels(before, pic, ends, LS_LOADING.bit0, LS_LOADING.bit1, ends[6911], LS_LOADING).data), '4ef5c2259921cc1a68c01ef7e06ed2b5d05e9fcb12e1058c141157f60cbf6d59');

// halfway, the border holds both stripe colours and nothing else
const mid = S.loadingPixels(before, pic, ends, LS_LOADING.bit0, LS_LOADING.bit1, ends[3456], LS_LOADING), seen = new Set();
for (let y = 0; y < mid.height; y++) for (let x = 0; x < mid.width; x++) {
  if (y >= 16 && y < 208 && x >= 16 && x < 272) continue;
  const o = 4 * (y * mid.width + x);
  seen.add(S.PAL.findIndex((c) => c === '#' + [0, 1, 2].map((k) => mid.data[o + k].toString(16).padStart(2, '0')).join('')));
}
check('border colours halfway', [...seen].sort().join(), [...LS_LOADING.stripes].sort().join());

console.log(bad ? bad + ' difference(s)' : 'laser-squad loading picture: the tape\'s picture, at the tape\'s pace, with its border stripes');
process.exit(bad ? 1 : 0);
