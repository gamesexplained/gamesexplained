#!/usr/bin/env node
// Hold graphics.html's loading picture (the block dr-loading and the screens in dr-l-data) to the tape,
// TOSEC's "Driller (1987)(Incentive).tzx" (52,230 bytes, SHA-256
// fd7922c70b5b07938423455c9205fc9c35464de2dfac4d1911eba42a0d8b18f7):
// - the picture is block 6, a turbo block whose pulses last 583 T-states for a 0 and 1,166 for a 1 (its TZX
//   header), after a flag byte of 0; the screens must hash as below;
// - the page's pace is the tape's: tapeTimes (site/lib/spectrum.js) times each byte from the picture's
//   bits and the pulse lengths, and how many bytes were in at every 69,888 T-states (one frame of the
//   machine, ten to a step) from the end of the flag byte, worked out from the TZX's own timings, must
//   hash as below, with the bitmap in 21.91 seconds after the first byte, 27.98 seconds into the
//   tape, and the colours 24.58;
// - ZEsarUX 13.0, loading the tape at its own speed on 12 November 2026 with its screen memory read every
//   10 frames, held `before` at the picture's first byte, at every read the picture's bytes up to a front
//   and `before` past it, and the picture once its last byte was in; its own saved screen then matched
//   the page's drawing in all 49,152 pixels. Its pace differed from the tape's by up to 5 per cent, as
//   it plays a tape at 15,600 samples a second, so the page takes its pace from the TZX;
// - the border, while the bytes came in, was striped blue and yellow in ZEsarUX's saved screens;
// - with the bitmap in and the colours not, every pixel of the screen is black (the BASIC has made ink
//   and paper black);
// It exits 1 on any difference.
//   node games/spectrum/driller/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('spectrum');
const { DR_LOADING } = g.run('graphics.html', 'dr-loading', 'DR_LOADING');
const S = globalThis.Spectrum;
const D = JSON.parse(g.read('graphics.html').match(/<script type="application\/json" id="dr-l-data">([^<]*)<\/script>/)[1]);
const pic = S.unbase64(D.picture), before = S.unbase64(D.before);
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('picture', sha(pic), '5eb7f6ea52ee685ee2ca065a61796c4835eebb19c4a7d9d606f721532a7c2ef5');
check('before', sha(before), '71c642b31e5890a15ef92f3cbeba34edfb6e2e9f63079ecbda13a89d426f7d8b');
check('pulses for a 0 and a 1', [DR_LOADING.bit0, DR_LOADING.bit1].join(), '583,1166');
check('stripes', DR_LOADING.stripes.join(), '1,6');
check('border once the picture is in', DR_LOADING.borderColour, 0);

// The ledger's block 6 is the flag byte, the picture and a parity byte that makes their exclusive or 0.
const M = g.json('media.json').items.find((i) => i.label === 'block 6');
const parity = pic.reduce((a, b) => a ^ b, 0);
check('media.json block 6', sha([0, ...pic, parity]), M.sha256);
check('media.json block 6 answered', [M.answer, M.page].join(), 'data,graphics.html');

const ends = S.tapeTimes(pic, DR_LOADING.bit0, DR_LOADING.bit1), front = [];
for (let k = 0; ; k++) { const n = S.bytesIn(ends, k * 698880); front.push(n); if (n === 6912) break; }
check('front: steps', front.length, 125);
check('front: the TZX\'s', sha(front.join(',')), 'd10458c085fa51b3b9a107b6f2ee70e93cf3eabcbd2242590eac7b98016d06b1');
check('seconds to the bitmap', (ends[6143] / 3.5e6).toFixed(2), '21.91');
check('seconds to the colours', (ends[6911] / 3.5e6).toFixed(2), '24.58');

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
check('the whole picture', sha(S.screenPixels(S.partLoaded(before, pic, 6912), { borderColour: DR_LOADING.borderColour }).data), '97cd0b5f4ae2062eeb2c3a21bb86aa3e8318e8ef0f0d7b2320b9af7c44d394cb');
check('the player\'s last frame', sha(S.loadingPixels(before, pic, ends, DR_LOADING.bit0, DR_LOADING.bit1, ends[6911], DR_LOADING).data), '97cd0b5f4ae2062eeb2c3a21bb86aa3e8318e8ef0f0d7b2320b9af7c44d394cb');

// halfway, the border holds both stripe colours and nothing else
const mid = S.loadingPixels(before, pic, ends, DR_LOADING.bit0, DR_LOADING.bit1, ends[3456], DR_LOADING), seen = new Set();
for (let y = 0; y < mid.height; y++) for (let x = 0; x < mid.width; x++) {
  if (y >= 16 && y < 208 && x >= 16 && x < 272) continue;
  const o = 4 * (y * mid.width + x);
  seen.add(S.PAL.findIndex((c) => c === '#' + [0, 1, 2].map((k) => mid.data[o + k].toString(16).padStart(2, '0')).join('')));
}
check('border colours halfway', [...seen].sort().join(), [...DR_LOADING.stripes].sort().join());

console.log(bad ? bad + ' difference(s)' : 'driller loading picture: the tape\'s picture, at the tape\'s pace, with its border stripes');
process.exit(bad ? 1 : 0);
