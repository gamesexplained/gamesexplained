'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const r of JSON.parse(fs.readFileSync(path.join(__dirname, 'parts/resident/listing.json'))).records) if (r.b) base.set(r.b, r.a);
let cases = 0;
for (const high of [0, 1, 2, 255]) for (const playerHigh of [0, 1])
  for (const flags of [0, 1]) for (let x = 0; x < 256; x++) {
    const m = base.slice(), entity = 2, displaySlot = 5, playerLow = (x * 73 + 11) & 255;
    m[0x1a29 + entity] = displaySlot;
    m[0x4c4f + displaySlot] = high; m[0x4c6f + displaySlot] = x;
    m[0x192a + entity] = flags;
    m[0x48] = playerHigh; m[0x47] = playerLow;
    const cpu = new CPU(m); cpu.call(0x72fc, {x: entity, y: 0x57}, {maxSteps: 100});
    const a = (((high & 1) << 7) | (x >> 1)) + (flags ? 6 : 0) & 255;
    const b = ((playerHigh & 1) << 7) | (playerLow >> 1);
    assert.equal(cpu.a, a); assert.equal(cpu.c, +(a >= b)); assert.equal(cpu.z, 0);
    assert.equal(cpu.y, 0x57); assert.equal(cpu.x, entity); cases++;
  }
// Equality still returns Z clear when the saved Y is nonzero: LDY changes Z after CMP.
{
  const m = base.slice(); m[0x1a2b] = 5; m[0x4c54] = 1; m[0x4c74] = 40;
  m[0x192c] = 0; m[0x48] = 1; m[0x47] = 40;
  const cpu = new CPU(m); cpu.call(0x72fc, {x: 2, y: 0x57}, {maxSteps: 100});
  assert.equal(cpu.a, 148); assert.equal(cpu.c, 1); assert.equal(cpu.z, 0); assert.equal(cpu.y, 0x57);
}
console.log(`OK - ${cases} half-coordinate comparisons, carry, wrap and Y-restored flags`);
