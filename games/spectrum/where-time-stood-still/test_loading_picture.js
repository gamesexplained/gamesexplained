#!/usr/bin/env node
// Hold graphics.html's loading picture (the block wt-loading and the screens in wt-l-data) to the tape,
// TOSEC's "Where Time Stood Still (1988)(Ocean)(128K)[aka Land That Time Forgot, The][aka Tibet].tzx"
// (126,274 bytes, SHA-256 10d2f1cdc169697db0290b0e621d5ff0c83d93bebeca70a14f5daa56f7f89bc4):
// - the picture is blocks 11 (the bitmap, 6,144 bytes) and 13 (the colours, 768), pure data blocks whose
//   pulses last 753 T-states for a 0 and 1,508 for a 1 (their TZX headers), with 42 pulses, 56,000
//   T-states, between them. The loader stores each byte b off the tape as 16 - (b XOR $3E), so the
//   blocks are the picture through wtTape, and must hash as below;
// - the page's pace is the tape's: tapeTimes (site/lib/spectrum.js) times each byte from those bits, and
//   how many bytes were in at every 69,888 T-states (one frame of the machine, ten to a step) from the
//   bitmap's first byte must hash as below, with the bitmap in 31.89 seconds after it, 71.26 seconds into
//   the tape. The page leaves out the 56,000 T-states between the blocks, so on the tape each colour
//   comes 16 thousandths of a second later than the page has it: with them put in, the steps hash as the
//   TZX's own timings give them, and differ from the page's in 24 of 185 steps by up to 4 bytes;
// - ZEsarUX 13.0, loading the tape at its own speed on 12 November 2026 with its screen memory read every
//   10 frames, held `before` (all 0) at the bitmap's first byte, at every read up to the bitmap's last
//   byte the picture's bitmap up to a front and `before` past it, then the same screen for 240 frames
//   while the colours came in, and then, in one read, the whole picture; its own saved screen then
//   matched the page's drawing in all 49,152 pixels. Its pace differed from the TZX's by up to 31 bytes,
//   as it plays a tape at 15,600 samples a second, so the page takes its pace from the TZX;
// - the border, while the bytes came in and after, was striped black and blue in ZEsarUX's saved screens;
// - read on, ZEsarUX kept the picture up, the border still striped, until it put up the control selection
//   screen 592 seconds after the picture appeared; the TZX's last block ends 594 seconds after the
//   colours' last byte, so the page says nearly ten minutes;
// - nothing of the picture shows until its last byte is in, and then all of it does.
// It exits 1 on any difference.
//   node games/spectrum/where-time-stood-still/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('spectrum');
const { WT_LOADING, wtTape } = g.run('graphics.html', 'wt-loading', 'WT_LOADING', 'wtTape');
const S = globalThis.Spectrum;
const page = g.read('graphics.html');
const D = JSON.parse(page.match(/<script type="application\/json" id="wt-l-data">([^<]*)<\/script>/)[1]);
const pic = S.unbase64(D.picture), before = S.unbase64(D.before), tape = wtTape(pic);
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

check('picture', sha(pic), '869b61a391d6e55decd2a5c956abfdefafa271864caa71304ef9e51ac4b9f901');
check('before', sha(before), '71c642b31e5890a15ef92f3cbeba34edfb6e2e9f63079ecbda13a89d426f7d8b');
check('before is all 0', before.every((b) => b === 0), true);
check('block 11, the bitmap as the tape holds it', sha(tape.subarray(0, 6144)), '09d482920575e2e4cdb99d2c82c269ba57a9450c843dd7c573b7f501ef94f5b4');
check('block 13, the colours as the tape holds them', sha(tape.subarray(6144)), '041c9a2018172a48217b6a1514efbf6cce06d611e5fb4bdcaee1d52e9adf9f13');
check('the loader turns the tape back into the picture', tape.every((b, i) => ((16 - (b ^ 0x3E)) & 255) === pic[i]), true);
check('pulses for a 0 and a 1', [WT_LOADING.bit0, WT_LOADING.bit1].join(), '753,1508');
check('stripes', WT_LOADING.stripes.join(), '0,1');
check('border once the picture is in', WT_LOADING.borderColour, 0);
check('held', JSON.stringify(WT_LOADING.held), '[[6144,6912]]');

const ends = S.tapeTimes(tape, WT_LOADING.bit0, WT_LOADING.bit1);
const steps = (E) => { const f = []; for (let k = 0; ; k++) { const n = S.bytesIn(E, k * 698880); f.push(n); if (n === 6912) return f; } };
const front = steps(ends), tzx = steps(ends.map((e, i) => (i < 6144 ? e : e + 56000)));
check('front: steps', front.length, 185);
check('front: the page\'s', sha(front.join(',')), 'c689a0002ade4347a1204a058257afbb7d096ab3d2201e8c387ba1731bc9ef07');
check('front: the TZX\'s, with the pulses between the blocks', sha(tzx.join(',')), 'cc85150fd6d635dd32fba11754d6d00b7548685c4ad00111231f049b55f614b5');
check('steps where the two differ, by at most', [front.filter((n, k) => n !== tzx[k]).length, Math.max(...front.map((n, k) => Math.abs(n - tzx[k])))].join(), '24,4');
check('seconds to the bitmap', (ends[6143] / 3.5e6).toFixed(2), '31.89');
check('seconds to the colours, with the pulses between', ((ends[6911] + 56000) / 3.5e6).toFixed(2), '36.65');

// nothing shows until the last byte, then everything
const lit = (n) => {
  const img = S.screenPixels(S.partLoaded(before, pic, n, WT_LOADING.held), { border: 0 }); let k = 0;
  for (let i = 0; i < 256 * 192; i++) if (img.data[4 * i] | img.data[4 * i + 1] | img.data[4 * i + 2]) k++;
  return k;
};
check('pixels lit before the load, with the bitmap in, with all but the last colour in', [lit(0), lit(6144), lit(6911)].join(), '0,0,0');
for (const n of [0, 3000, 6144, 6500, 6911]) {
  const R = S.partLoaded(before, pic, n, WT_LOADING.held);
  let wrong = 0;
  for (let i = 0; i < 6912; i++) if (R[0x4000 + i] !== (i < Math.min(n, 6144) ? pic[i] : before[i])) wrong++;
  check(`screen with ${n} bytes in`, wrong, 0);
}
check('the whole picture', sha(S.screenPixels(S.partLoaded(before, pic, 6912, WT_LOADING.held), { borderColour: WT_LOADING.borderColour }).data), 'f689ad35695e01b5c3d4e3ea15c8920b2047abe7b527737e33905a6073ef776d');
check('the player\'s last frame', sha(S.loadingPixels(before, pic, ends, WT_LOADING.bit0, WT_LOADING.bit1, ends[6911], Object.assign({ tape }, WT_LOADING)).data), 'f689ad35695e01b5c3d4e3ea15c8920b2047abe7b527737e33905a6073ef776d');

// halfway, the border holds both stripe colours and nothing else
const mid = S.loadingPixels(before, pic, ends, WT_LOADING.bit0, WT_LOADING.bit1, ends[3456], Object.assign({ tape }, WT_LOADING)), seen = new Set();
for (let y = 0; y < mid.height; y++) for (let x = 0; x < mid.width; x++) {
  if (y >= 16 && y < 208 && x >= 16 && x < 272) continue;
  const o = 4 * (y * mid.width + x);
  seen.add(S.PAL.findIndex((c) => c === '#' + [0, 1, 2].map((k) => mid.data[o + k].toString(16).padStart(2, '0')).join('')));
}
check('border colours halfway', [...seen].sort().join(), [...WT_LOADING.stripes].sort().join());

check('the page says so', ['for 32 seconds the bitmap comes in unseen', '76 seconds into the tape', '39 seconds into the tape',
  'The bitmap takes 31.9 seconds and the colours 4.7 more, about 190 bytes a second', 'for nearly ten minutes'].filter((s) => !page.includes(s)).join(), '');

console.log(bad ? bad + ' difference(s)' : 'where-time-stood-still loading picture: the tape\'s picture, at the tape\'s pace, kept dark until its colours are in');
process.exit(bad ? 1 : 0);
