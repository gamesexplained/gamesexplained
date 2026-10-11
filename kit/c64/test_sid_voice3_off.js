'use strict';
// Voice 3 off ($D418 bit 7) in site/lib/sid.js, with the filter on and off. On the chip the bit
// disconnects voice 3 from the output unless $D417 routes voice 3 to the filter; games that read
// voice 3's oscillator as a random source set it to keep the noise silent. Each case plays voice 3's
// noise at full sustain for a tenth of a second and measures the output. Exits 1 on any failure.
// node kit/c64/test_sid_voice3_off.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));

const E = globalThis.C64Sid.engine();
let fails = 0;
function level(filter, route, mode) {
  const sid = E.createSID(44100, { filter });
  for (const [r, v] of [[14, 0xFF], [15, 0xFF], [19, 0x00], [20, 0xF0], [23, route], [24, mode], [18, 0x81]]) sid.write(r, v);
  let e = 0;
  for (let i = 0; i < 4410; i++) { const y = sid.sample(); if (i > 2205) e += y * y; }
  return Math.sqrt(e / 2205);
}
for (const filter of ['none', '6581', '8580']) {
  const on = level(filter, 0x00, 0x0F), off = level(filter, 0x00, 0x8F);
  if (!(on > 0.01)) { fails++; console.log(`FAIL ${filter}: voice 3 with $D418 = $0F is silent (${on.toFixed(4)})`); }
  if (!(off < on / 100)) { fails++; console.log(`FAIL ${filter}: voice 3 off still sounds (${off.toFixed(4)} against ${on.toFixed(4)})`); }
}
// routed to the filter, voice 3 off does not apply: with the filter off it plays straight out
const routed = level('none', 0x04, 0x8F);
if (!(routed > 0.01)) { fails++; console.log(`FAIL none: voice 3 routed to the filter is cut by voice 3 off (${routed.toFixed(4)})`); }
console.log(fails ? `${fails} failure(s)` : 'voice 3 off: all cases pass');
process.exit(fails ? 1 : 0);
