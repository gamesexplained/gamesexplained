'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const part of ['resident', 'stage-01']) {
  for (const r of JSON.parse(fs.readFileSync(path.join(__dirname, 'parts', part, 'listing.json'))).records) {
    if (r.b) base.set(r.b, r.a);
  }
}
// Stop at the selected message or prompt, with rendering and slot deletion stubbed.
for (const [high, low, price, flags, expected, message, disabled] of [
  [1, 0, 0x50, 0, 0xa67e, 0xa8e5, 0],
  [0, 0x50, 0x50, 1, 0xa67e, 0xa8ce, 0],
  [0, 0x49, 0x50, 3, 0xa78b, 0xa939, 0],
  [0, 0x49, 0x50, 2, 0xa78b, 0xa939, 0],
  [0, 0x49, 0x50, 1, 0xa78b, 0xa923, 1],
]) {
  const m = base.slice();
  m[0x46] = 7; m[0x7b] = 0; m[0x4dbd] = 0;
  m[0x4dc7] = high; m[0x4dc9] = low; m[0x4789] = price; m[0x4753] = flags;
  m[0xa504] = 0x60; // render stub
  m.set([0xe6, 0x10, 0x60], 0xa7d2); // deletion marker
  const cpu = new CPU(m); cpu.pc = 0xa49b;
  cpu.run({ until: expected, maxSteps: 100 });
  assert.equal(cpu.pc, expected);
  assert.equal(cpu.x | cpu.y << 8, message);
  assert.equal(m[0x10], disabled);
  assert.equal(m[0xa800], 8); assert.equal(m[0xa84a], 8); assert.equal(m[0x2c15], 2);
}
console.log('OK - payment screen selection with callbacks stubbed');
