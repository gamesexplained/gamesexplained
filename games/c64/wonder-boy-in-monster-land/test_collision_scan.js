'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const r of JSON.parse(fs.readFileSync(path.join(__dirname, 'parts/resident/listing.json'))).records) if (r.b) base.set(r.b, r.a);
function fresh() {
  const m = base.slice(); m.fill(0, 0x1919, 0x1919 + 17);
  m[0x1a2b] = 1; m[0x1a6f] = 10; m[0x6f] = 0;
  m.set([0x38, 0x60], 0x75e3); // controlled overlap
  return m;
}
function call(m) { const cpu = new CPU(m); cpu.call(0x7330, {x: 2, y: 0x57}, {maxSteps: 10000}); return cpu; }
for (const [type, damage, xoff, yoff, width, height] of [[0x27,1,4,13,4,8], [0x29,2,3,10,6,11], [0x28,3,1,5,10,15]]) {
  const m = fresh(); m[0x191c] = type; m[0x1a2c] = 7;
  m[0x4c56] = 1; m[0x4c76] = 80; m[0x4cd6] = 40;
  const cpu = call(m);
  assert.equal(cpu.c, 1); assert.equal(cpu.x, 2); assert.equal(cpu.y, 0x57);
  assert.deepEqual(Array.from(m.slice(0x762a, 0x762e)), [168+xoff, 40+yoff, width, height]);
  assert.equal(m[0x1b1a], 0x80); assert.equal(m[0x1a6f], 10-damage); assert.equal(m[0x1a91], 8);
}
{
  const m = fresh(); m[0x1a2b] = 0; const cpu = call(m);
  assert.equal(cpu.c, 0); assert.equal(cpu.x, 2); assert.equal(m[0x1a6f], 10);
}
{
  const m = fresh(); m[0x6f] = 1; m[0x4dbd] = 0; m[0x4ddb] = 3;
  const cpu = call(m); assert.equal(cpu.c, 1); assert.equal(m[0x1a6f], 4);
}
{
  const m = fresh(); m[0x191c] = 0x27; m[0x1a2c] = 7;
  m.set([0x18, 0x60], 0x75e3); const cpu = call(m);
  assert.equal(cpu.c, 0); assert.equal(cpu.x, 2); assert.equal(m[0x1a6f], 10);
}
// Type $27 takes priority over $29 even when $29 has a higher slot index.
{
  const m = fresh(); m[0x191a] = 0x27; m[0x1a2a] = 7; m[0x1929] = 0x29; m[0x1a39] = 7;
  call(m); assert.equal(m[0x1a6f], 9); assert.equal(m[0x1b18], 0x80); assert.notEqual(m[0x1b27], 0x80);
}
console.log('OK - entity collision scan, type priority, box fields and damage with overlap stub');
