'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const r of JSON.parse(fs.readFileSync(path.join(__dirname, 'parts/resident/listing.json'))).records) if (r.b) base.set(r.b, r.a);
function setup() {
  const m = base.slice(); m[0x5285] = 1; m[0x49] = 50; m[0x4dbd] = 0;
  m[0x4ddb] = 3; m[0x4a] = 0x6e; m[0x4dae] = 100; m[0x1a6f] = 10;
  m.set([0x38, 0x60], 0x75e3); // controlled overlap
  m[0x7a91] = 0x60; // message callback stub
  return m;
}
function call(m) { const cpu = new CPU(m); cpu.call(0x7430, {x: 2}, {maxSteps: 10000}); return cpu; }
for (const face of [0, 1]) for (const doubled of [false, true]) {
  const m = setup(); m[0x1177] = face; m[0x4de2] = doubled ? 0x20 : 0; m[0x4ddf] = 2;
  const cpu = call(m);
  assert.equal(cpu.c, 1); assert.equal(m[0x5285], 0);
  assert.equal(m[0x762a], face ? 108 : 96); assert.equal(m[0x762b], 63);
  assert.equal(m[0x762c], 8); assert.equal(m[0x762d], 3);
  assert.equal(m[0x1a6f], doubled ? 4 : 7); assert.equal(m[0x1a91], 8);
  assert.equal(m[0x4ddf], doubled ? 1 : 2);
}
{
  const m = setup(); m[0x1a6f] = 2; const cpu = call(m);
  assert.equal(m[0x1a6f], 0); assert.equal(cpu.c, 1);
}
{
  const m = setup(); m[0x4de2] = 0x20; m[0x4ddf] = 1; call(m);
  assert.equal(m[0x4de2] & 0x20, 0); assert.equal(m[0x4ddf], 0); assert.equal(m[0x1a6f], 4);
}
for (const [a, value] of [[0x5285, 0], [0x49, 0xfe], [0x4ddb, 0], [0x4a, 0]]) {
  const m = setup(); m[a] = value; const cpu = call(m);
  assert.equal(cpu.c, 0); assert.equal(m[0x1a6f], 10);
}
{
  const m = setup(); m.set([0x18, 0x60], 0x75e3); const cpu = call(m);
  assert.equal(cpu.c, 0); assert.equal(m[0x5285], 1); assert.equal(m[0x1a6f], 10);
}
// The Gauntlet pickup sets ten qualifying contacts; its tenth hit is doubled.
{
  const m = setup(); m[0x4de2] = 0;
  m.set([0x8d, 0xf0, 0x02, 0x60], 0x77e2); // capture message ID
  m[0x4454] = 0x60; // release callback stub
  m.set([0x8d, 0xf1, 0x02, 0x60], 0x7a91); // capture expiry message ID
  const cpu = new CPU(m); cpu.call(0x7688, {x: 2, y: 0x57}, {maxSteps: 1000});
  assert.equal(m[0x4de2] & 0x20, 0x20); assert.equal(m[0x4ddf], 10);
  assert.equal(m[0x2f0], 11); assert.equal(cpu.x, 2); assert.equal(cpu.y, 0x57);
  assert.equal(m[0x5636 + 10] | m[0x564c + 10] << 8, 0x5526);
  assert.equal(m[0x5636 + 11] | m[0x564c + 11] << 8, 0x553d);
  for (let i = 0; i < 10; i++) {
    m[0x5285] = 1; m[0x1a6f] = 10; call(m);
    assert.equal(m[0x1a6f], 4, `double damage on hit ${i + 1}`);
    assert.equal(m[0x4ddf], 9 - i);
    assert.equal(!!(m[0x4de2] & 0x20), i !== 9);
  }
  assert.equal(m[0x2f1], 12);
  m[0x5285] = 1; m[0x1a6f] = 10; call(m); assert.equal(m[0x1a6f], 7);
}
console.log('OK - attack box, gates, contact budget, damage and ten-hit Gauntlet expiry with overlap stub');
