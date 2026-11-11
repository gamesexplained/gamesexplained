'use strict';
// Exercise the captured resident instructions, without a game snapshot.
const assert = require('assert');
const path = require('path');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const listing = require(path.join(__dirname, 'parts/resident/listing.json'));
const initial = new Uint8Array(65536);
for (const r of listing.records) if (r.b) initial.set(r.b, r.a);
function visit(mem, stop) {
  const cpu = new CPU(mem); cpu.pc = 0x0a92;
  for (let n = 0; n < 50 && cpu.pc !== stop; n++) cpu.step();
  assert.equal(cpu.pc, stop, 'wing-boots branch reached its expected exit');
}
function check(flag, step, up, count, expected, stop = 0x0abe) {
  const m = initial.slice(); m[0x4dbd] = 0; m[0x4de2] = flag; m[0x4db5] = step;
  m[0x71] = up; m[0x4de0] = count; visit(m, stop);
  assert.deepEqual([m[0x4de0], m[0x4db5], m[0x4de2]], expected);
}
check(0, 3, 0, 2, [2, 3, 0]);
check(8, 3, 1, 2, [2, 3, 8]);
check(8, 4, 0, 2, [2, 4, 8]);
check(8, 3, 0, 2, [1, 1, 8]);
check(0x18, 3, 0, 1, [0, 3, 0x10], 0x0abb);
const m = initial.slice(); m[0x4dbd] = 0; m[0x4de2] = 8; m[0x4db5] = 3; m[0x71] = 0; m[0x4de0] = 255;
for (let n = 0; n < 254; n++) visit(m, 0x0abe);
assert.equal(m[0x4de0], 1); assert.equal(m[0x4de2] & 8, 8);
visit(m, 0x0abb); assert.equal(m[0x4de0], 0); assert.equal(m[0x4de2] & 8, 0);
console.log('OK - wing-boots conditions and 255 qualifying visits');
