'use strict';
// Exercise the captured reward instructions, without a game snapshot.
const assert = require('assert');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const listing = require('./parts/resident/listing.json');
const initial = new Uint8Array(65536);
for (const r of listing.records) if (r.b) initial.set(r.b, r.a);
let cases = 0;
for (let prevLeft = 0; prevLeft <= 1; prevLeft++)
for (let prevRight = 0; prevRight <= 1; prevRight++)
for (let left = 0; left <= 1; left++)
for (let right = 0; right <= 1; right++)
for (const vertical of [0, 0x80]) {
  const m = initial.slice(); m[0x5264] = prevLeft; m[0x5265] = prevRight;
  m[0x73] = left; m[0x74] = right; m[0x4db3] = vertical; m[0x1ab1] = 5;
  new CPU(m).call(0x5c0c);
  const reversal = vertical === 0 && (right === 0 ? prevLeft === 0 : left === 0 && prevRight === 0);
  assert.equal(m[0x1ab1], reversal ? 0xff : 5); cases++;
}
for (let offset = 0; offset < 5; offset++) {
  const m = initial.slice(); m[0x7731] = 0xff;
  const cpu = new CPU(m); cpu.a = offset; cpu.c = 0; cpu.d = 1; cpu.pc = 0x7730; cpu.step();
  assert.equal(cpu.a, 0x65 + offset); assert.equal(cpu.pc, 0x7732);
}
console.log(`OK - ${cases} reversal cases and five decimal reward additions`);
