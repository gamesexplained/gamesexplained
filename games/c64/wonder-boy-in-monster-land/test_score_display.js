'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const r of JSON.parse(fs.readFileSync(path.join(__dirname, 'parts/resident/listing.json'))).records)
  if (r.b) base.set(r.b, r.a);
function call(m, address, regs = {}) { new CPU(m).call(address, regs, {maxSteps: 100000}); }
function expected(m, glyph, destination) {
  for (let row = 0; row < 8; row++) assert.equal(m[destination + 3 * row], base[0xc800 + glyph * 8 + row]);
}
// The nibble splitter accepts all 256 byte values and restores A and Y.
for (let value = 0; value < 256; value++) {
  const m = base.slice(), cpu = new CPU(m);
  cpu.call(0x36e9, {a: value, y: 0x73}, {maxSteps: 100});
  assert.equal(m[0x3709], (value >> 4) + 1);
  assert.equal(m[0x370a], (value & 15) + 1);
  assert.equal(cpu.a, value); assert.equal(cpu.y, 0x73);
}
for (const glyph of [0, 1, 10]) {
  const m = base.slice();
  m[0x39fb] = 0x19; m[0x39fc] = 0xd8;
  call(m, 0x39e7, {a: glyph});
  expected(m, glyph, 0xd819);
  assert.equal(m[1], 0x35);
}
// In single-player mode the high-score path suppresses the first five zeroes,
// caches its three packed bytes, and writes six digits plus a fixed zero.
{
  const m = base.slice(); m[0x4dbc] = 0;
  m[0x4dbe] = 0x00; m[0x4dbf] = 0x12; m[0x4dc0] = 0x34;
  m[0x4da3] = 0xff;
  call(m, 0x3a0a);
  assert.deepEqual(Array.from(m.slice(0x3bac, 0x3bb2)), [0, 0, 2, 3, 4, 5]);
  assert.deepEqual(Array.from(m.slice(0x4da3, 0x4da6)), [0, 0x12, 0x34]);
  [0xd8d9, 0xd8da, 0xd918, 0xd919, 0xd91a, 0xd958, 0xd959]
    .forEach((dest, i) => expected(m, [0, 0, 2, 3, 4, 5, 1][i], dest));
  m[0xd8d9] ^= 0xff;
  const changed = m[0xd8d9];
  call(m, 0x3a0a);
  assert.equal(m[0xd8d9], changed, 'unchanged high score returns without redrawing');
}
// The first score caches each decoded glyph and copies only changed columns.
{
  const m = base.slice(); m[0x4dbc] = 1; m[0x4dbd] = 0;
  m[0x4dc1] = 0x00; m[0x4dc3] = 0x12; m[0x4dc5] = 0x34;
  m.fill(0xff, 0x4da6, 0x4dac);
  call(m, 0x38fe);
  assert.deepEqual(Array.from(m.slice(0x3bac, 0x3bb2)), [0, 0, 2, 3, 4, 5]);
  assert.deepEqual(Array.from(m.slice(0x4da6, 0x4dac)), [0, 0, 2, 3, 4, 5]);
  [0xd819, 0xd81a, 0xd858, 0xd859, 0xd85a, 0xd898, 0xd899]
    .forEach((dest, i) => expected(m, [0, 0, 2, 3, 4, 5, 1][i], dest));
  m[0xd819] ^= 0xff; m[0xd899] ^= 0xff;
  const unchanged = m[0xd819]; call(m, 0x38fe);
  assert.equal(m[0xd819], unchanged, 'unchanged first digit is skipped');
  expected(m, 1, 0xd899); // the fixed last zero is always redrawn
}
// In two-player mode the alternate score is drawn only when player index is nonzero.
{
  const m = base.slice(); m[0x4dbc] = 1; m[0x4dbd] = 1;
  m[0x4dc2] = 0x00; m[0x4dc4] = 0x56; m[0x4dc6] = 0x78;
  call(m, 0x3a0a);
  assert.deepEqual(Array.from(m.slice(0x3bac, 0x3bb2)), [0, 0, 6, 7, 8, 9]);
  [0xd8d9, 0xd8da, 0xd918, 0xd919, 0xd91a, 0xd958, 0xd959]
    .forEach((dest, i) => expected(m, [0, 0, 6, 7, 8, 9, 1][i], dest));
  const skipped = base.slice(); skipped[0x4dbc] = 1; skipped[0x4dbd] = 0;
  const before = skipped.slice(0x3bac, 0x3bb2); call(skipped, 0x3a0a);
  assert.deepEqual(skipped.slice(0x3bac, 0x3bb2), before);
}
console.log('OK - score glyph copy, high-score cache, zero suppression and alternate score');
