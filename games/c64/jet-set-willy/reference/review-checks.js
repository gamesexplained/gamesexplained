// Run from any directory: node games/c64/jet-set-willy/reference/review-checks.js
// Controlled calls use published bytes; they do not prove ordinary-play reachability.
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const {CPU} = require(path.resolve(__dirname, '../../../../kit/c64/cpu6502.js'));
const listing = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../listing.json')));
const image = new Uint8Array(65536);
for (const r of listing.records) if (r.b) image.set(r.b, r.a);
let cases = 0;
for (const value of [1, 0x30, 0x39, 0x41]) {
  const cpu = new CPU(image.slice()); let error = false;
  cpu.call(0x0d6f, {}, {hooks: {
    0x0b8e: c => {c.a = value; c.z = value === 1 ? 1 : 0; c.rts();},
    0x0bb9: () => {error = true; return true;},
  }});
  assert.equal(error, value === 1);
  if (!error) assert.equal(cpu.c, value >= 0x3a ? 1 : 0);
  cases++;
}
for (const [keys, key, fire, launches] of [[0,0,1,false],[1,0x0d,0,true],
                                          [1,0x41,1,true],[1,0x41,0,false]]) {
  const cpu = new CPU(image.slice()); cpu.m[0x50]=keys; cpu.m[0x51]=key;
  cpu.m[0xdc00]=fire ? 0xef : 0xff; cpu.m[0xfe]=0;
  cpu.pc=0xa7d3; cpu.step(); // skip the colour-row call, which does not read input
  cpu.pc=0xa7d6;
  cpu.run({until: launches ? 0x2000 : 0xa7d3, maxSteps:100});
  assert.equal(cpu.pc, launches ? 0x2000 : 0xa7d3); cases++;
}
for (let i=0;i<34;i++) {
  assert.equal(image[0x1856+2*i] + 256*image[0x1857+2*i], 0x8100+192*i);
  const cpu=new CPU(image.slice()); cpu.m[0x403]=i; cpu.call(0x1c86);
  assert.equal(cpu.m[7]+256*cpu.m[8],0x189c+32*(i%17));cases++;
}
assert.deepEqual(Array.from(image.slice(0x2231,0x2239)),[1,2,4,8,16,32,64,128]);
assert.deepEqual(Array.from(image.slice(0x2239,0x2241)),[254,253,251,247,239,223,191,127]);
cases+=2;
console.log(`${cases} controlled source checks passed`);
