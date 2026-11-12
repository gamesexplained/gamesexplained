#!/usr/bin/env node
// Hold graphics.html's loading picture (the block vh-loading and the screens in vh-l-data) to the tape,
// TOSEC's "Valhalla (1983)(Legend).tzx" (47,920 bytes, SHA-256
// 26ff54b554613e147cdc20e3b4b9f3cf4868b8840ab4ba9a90dab51aed81ed1d):
// - the picture is the file vlogo, block 5, at the ROM's speed: pulses of 855 T-states for a 0 and 1,710 for a 1,
//   after a flag byte of 255; the screens must hash as below;
// - the page's pace is the tape's: tapeTimes (site/lib/spectrum.js) times each byte from the picture's
//   bits and the pulse lengths, and how many bytes were in at every 69,888 T-states (one frame of the
//   machine, ten to a step) from the end of the flag byte, worked out from the TZX's own timings, must
//   hash as below, with the bitmap in 30.68 seconds after the first byte, 20.60 seconds into the
//   tape, and the colours 35.07;
// - ZEsarUX 13.0, loading the tape at its own speed on 12 November 2026 with its screen memory read every
//   10 frames, held `before` at the picture's first byte, at every read the picture's bytes up to a front
//   and `before` past it, and the picture once its last byte was in; its own saved screen then matched
//   the page's drawing in all 49,152 pixels. Its pace differed from the tape's by up to 5 per cent, as
//   it plays a tape at 15,600 samples a second, so the page takes its pace from the TZX;
// - the border, while the bytes came in, was striped blue and yellow in ZEsarUX's saved screens;
// - before the load only row of cells 11 shows anything, "VALHALLA is loading." in white, and with the
//   bitmap in and the colours not nothing does: the picture has nothing in those cells;
// It exits 1 on any difference.
//   node games/spectrum/valhalla/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('spectrum');
const { VH_LOADING } = g.run('graphics.html', 'vh-loading', 'VH_LOADING');
const S = globalThis.Spectrum;
const D = JSON.parse(g.read('graphics.html').match(/<script type="application\/json" id="vh-l-data">([^<]*)<\/script>/)[1]);
const pic = S.unbase64(D.picture), before = S.unbase64(D.before);
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('picture', sha(pic), '1df1563a5cfc993426a6c8e6e684c8cc056fde3c451f2962d00801873c788e2c');
check('before', sha(before), '98bd29964f6429447a143b1cb0e6fab0fb1f05515211a0f2de9d2902027db456');
check('pulses for a 0 and a 1', [VH_LOADING.bit0, VH_LOADING.bit1].join(), '855,1710');
check('stripes', VH_LOADING.stripes.join(), '1,6');
check('border once the picture is in', VH_LOADING.borderColour, 0);

const ends = S.tapeTimes(pic, VH_LOADING.bit0, VH_LOADING.bit1), front = [];
for (let k = 0; ; k++) { const n = S.bytesIn(ends, k * 698880); front.push(n); if (n === 6912) break; }
check('front: steps', front.length, 177);
check('front: the TZX\'s', sha(front.join(',')), 'c880cc40295e72fb957c1217cf330a5e095b849d1fd872f9e11e40490b31ba3e');
check('seconds to the bitmap', (ends[6143] / 3.5e6).toFixed(2), '30.68');
check('seconds to the colours', (ends[6911] / 3.5e6).toFixed(2), '35.07');

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
check('rows of cells lit before the load', lit(0), '11');
check('rows of cells lit with the bitmap in', lit(6144), '');
check('the whole picture', sha(S.screenPixels(S.partLoaded(before, pic, 6912), { borderColour: VH_LOADING.borderColour }).data), '5e924ec6973fc7c03fc6b77d5b4dbb4a5b2e78f504a1501eac9b24398b9f2329');
check('the player\'s last frame', sha(S.loadingPixels(before, pic, ends, VH_LOADING.bit0, VH_LOADING.bit1, ends[6911], VH_LOADING).data), '5e924ec6973fc7c03fc6b77d5b4dbb4a5b2e78f504a1501eac9b24398b9f2329');

// halfway, the border holds both stripe colours and nothing else
const mid = S.loadingPixels(before, pic, ends, VH_LOADING.bit0, VH_LOADING.bit1, ends[3456], VH_LOADING), seen = new Set();
for (let y = 0; y < mid.height; y++) for (let x = 0; x < mid.width; x++) {
  if (y >= 16 && y < 208 && x >= 16 && x < 272) continue;
  const o = 4 * (y * mid.width + x);
  seen.add(S.PAL.findIndex((c) => c === '#' + [0, 1, 2].map((k) => mid.data[o + k].toString(16).padStart(2, '0')).join('')));
}
check('border colours halfway', [...seen].sort().join(), [...VH_LOADING.stripes].sort().join());

console.log(bad ? bad + ' difference(s)' : 'valhalla loading picture: the tape\'s picture, at the tape\'s pace, with its border stripes');
process.exit(bad ? 1 : 0);
