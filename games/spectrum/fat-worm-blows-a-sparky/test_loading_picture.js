#!/usr/bin/env node
// Hold graphics.html's loading picture (the block fw-loading and the screens in fw-l-data) to the tape,
// TOSEC's "Fat Worm Blows a Sparky (1986)(Durell).tzx" (49,407 bytes,
// SHA-256 20c7b8f5c0b9022ba5142b3489d8b8848dcdd8697077f48d7020b6b6a3ec597a):
// - the picture is the first 6,912 bytes of block 6's 49,000, after a flag byte of 0; block 6 is a turbo block whose
//   pulses last 453 T-states for a 0 and 709 for a 1 (its TZX header); the screens must hash as below;
// - the page's pace is the tape's: tapeTimes (site/lib/spectrum.js) times each byte from the picture's
//   bits and the pulse lengths, and how many bytes were in at every 69,888 T-states (one frame of the
//   machine, ten to a step) from the end of the flag byte, worked out from the TZX's own timings, must
//   hash as below, with the bitmap in 14.93 seconds after the first byte, 21.38 seconds into the
//   tape, and the colours 16.82;
// - ZEsarUX 13.0, loading the tape at its own speed on 12 November 2026 with its screen memory read every
//   10 frames, held `before` at the picture's first byte, at every read the picture's bytes up to a front
//   and `before` past it, and the picture once its last byte was in; its own saved screen then matched
//   the page's drawing in all 49,152 pixels. Its pace differed from the tape's by up to 5 per cent, as
//   it plays a tape at 15,600 samples a second, so the page takes its pace from the TZX;
// - the border, while the bytes came in, was striped red and black in ZEsarUX's saved screens;
// - with the bitmap in and the colours not, every pixel of the screen is black (ink and paper are both
//   black);
// It exits 1 on any difference.
//   node games/spectrum/fat-worm-blows-a-sparky/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('spectrum');
const { FW_LOADING } = g.run('graphics.html', 'fw-loading', 'FW_LOADING');
const S = globalThis.Spectrum;
const D = JSON.parse(g.read('graphics.html').match(/<script type="application\/json" id="fw-l-data">([^<]*)<\/script>/)[1]);
const pic = S.unbase64(D.picture), before = S.unbase64(D.before);
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('picture', sha(pic), '072bff2e8329957f2e88df3c035c3530ba259c1edc202cbbbe3c2f6468800c7c');
check('before', sha(before), '5a034d831e5c07c5c7d318df88f7ef0122c5f5bfab8c38efea86dc688d638e14');
check('pulses for a 0 and a 1', [FW_LOADING.bit0, FW_LOADING.bit1].join(), '453,709');
check('stripes', FW_LOADING.stripes.join(), '2,0');
check('border once the picture is in', FW_LOADING.borderColour, 0);

const ends = S.tapeTimes(pic, FW_LOADING.bit0, FW_LOADING.bit1), front = [];
for (let k = 0; ; k++) { const n = S.bytesIn(ends, k * 698880); front.push(n); if (n === 6912) break; }
check('front: steps', front.length, 86);
check('front: the TZX\'s', sha(front.join(',')), 'e40b5ada29fb7f5bf7f7adce5c6100e3b09a9b0eda8cc5268a036bf8e494fea1');
check('seconds to the bitmap', (ends[6143] / 3.5e6).toFixed(2), '14.93');
check('seconds to the colours', (ends[6911] / 3.5e6).toFixed(2), '16.82');

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
check('rows of cells lit with the bitmap in', lit(6144), '');
check('the whole picture', sha(S.screenPixels(S.partLoaded(before, pic, 6912), { borderColour: FW_LOADING.borderColour }).data), 'f0ef954e9639b55b994b3b61a2e0f2405d5153421a5512c5feed017574184fe0');
check('the player\'s last frame', sha(S.loadingPixels(before, pic, ends, FW_LOADING.bit0, FW_LOADING.bit1, ends[6911], FW_LOADING).data), 'f0ef954e9639b55b994b3b61a2e0f2405d5153421a5512c5feed017574184fe0');

// halfway, the border holds both stripe colours and nothing else
const mid = S.loadingPixels(before, pic, ends, FW_LOADING.bit0, FW_LOADING.bit1, ends[3456], FW_LOADING), seen = new Set();
for (let y = 0; y < mid.height; y++) for (let x = 0; x < mid.width; x++) {
  if (y >= 16 && y < 208 && x >= 16 && x < 272) continue;
  const o = 4 * (y * mid.width + x);
  seen.add(S.PAL.findIndex((c) => c === '#' + [0, 1, 2].map((k) => mid.data[o + k].toString(16).padStart(2, '0')).join('')));
}
check('border colours halfway', [...seen].sort().join(), [...FW_LOADING.stripes].sort().join());

console.log(bad ? bad + ' difference(s)' : 'fat-worm-blows-a-sparky loading picture: the tape\'s picture, at the tape\'s pace, with its border stripes');
process.exit(bad ? 1 : 0);
