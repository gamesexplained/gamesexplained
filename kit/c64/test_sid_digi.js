'use strict';
// Samples through the volume register in site/lib/sid.js (opts.digi). A 6581 adds a DC level to the
// mixer, so a game that writes four-bit samples into $D418 from a timer interrupt is heard even with
// every voice silent; without the level the same writes are silent. Each case writes a square wave of
// volumes 4 and 11 into $D418 at 4 kHz for a tenth of a second, all voices off, and measures the
// output; a third case checks that a steady volume with digi on stays silent once the output stage's
// high pass has settled, so the level adds no tone of its own. Exits 1 on any failure.
// node kit/c64/test_sid_digi.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));

const E = globalThis.C64Sid.engine();
let fails = 0;
function level(digi, square) {
  const sid = E.createSID(44100, { digi });
  let e = 0, n = 0;
  for (let i = 0; i < 44100; i++) {
    if (square) sid.write(24, (Math.floor(i / 5.5125) & 1) ? 0x0B : 0x04);   // 4 kHz: a change every 5.5 samples
    else sid.write(24, 0x0B);
    const y = sid.sample();
    if (i > 22050) { e += y * y; n++; }
  }
  return Math.sqrt(e / n);
}
const off = level(0, true), on = level(2, true), steady = level(2, false);
if (!(off < 1e-6)) { fails++; console.log(`FAIL digi 0: volume changes make sound with no voice (${off})`); }
if (!(on > 0.05)) { fails++; console.log(`FAIL digi 2: volume changes are silent (${on.toFixed(4)})`); }
if (!(steady < 0.01)) { fails++; console.log(`FAIL digi 2: a steady volume sounds (${steady.toFixed(4)})`); }
console.log(fails ? `${fails} failure(s)` : `volume samples: silent without digi, ${on.toFixed(3)} rms with digi 2, quiet when steady`);
process.exit(fails ? 1 : 0);
