'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const r of JSON.parse(fs.readFileSync(path.join(__dirname, 'parts/resident/listing.json'))).records) if (r.b) base.set(r.b, r.a);
function reference([ax, ay, aw, ah, bx, by, bw, bh]) {
  const right = (bx + bw) & 255, bottom = (by + bh) & 255;
  if (ax >= right || (((ax + aw) & 255) + bw & 255) < right || ay >= bottom) return 0;
  const aBottom = ay + ah;
  if (aBottom > 255 || aBottom + bh > 255) return 1;
  return +(aBottom + bh >= bottom);
}
let seed = 0x9123, count = 0;
function check(values) {
  const m = base.slice(); m.set(values, 0x762a);
  const cpu = new CPU(m); cpu.call(0x75e3, {}, {maxSteps: 100});
  assert.equal(cpu.c, reference(values), values.join(',')); count++;
}
for (const v of [[10,10,5,5,12,12,5,5], [0,0,10,10,10,0,10,10],
                 [20,1,10,10,10,1,10,10], [0,250,10,10,0,240,10,10],
                 [250,10,10,10,250,10,10,10], [5,0,2,255,5,1,2,2]]) check(v);
for (let i = 0; i < 10000; i++) {
  const v = [];
  for (let j = 0; j < 8; j++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; v.push(seed >>> 24); }
  check(v);
}
console.log(`OK - ${count} rectangle cases, including edge and wrap paths, in binary arithmetic`);
