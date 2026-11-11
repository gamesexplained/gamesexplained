'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const part of ['resident','stage-01']) for (const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records) if (r.b) base.set(r.b,r.a);
for (const flags of [0x10,0x70]) {
 const m=base.slice(); m[0x4dbd]=0; m[0x4dba]=2; m[0x93c3]=flags;
 for (const a of [0x447a,0x2086,0x77e0]) m[a]=0x60;
 const cpu=new CPU(m); cpu.pc=0x93ba; cpu.run({until:0x9490,maxSteps:5000}); assert.equal(cpu.pc,0x9490);
 for (const [a,v] of [[0x2c15,0xfe],[0x4de2,flags],[0x4ddb,1],[0x4dba,3],[0x19c6,0xb3],[1,0x35]]) assert.equal(m[a],v);
 for (const [src,dst,n] of [[0x95ec,0xdc00,63],[0x962b,0xdc40,63],[0x966a,0xe080,63],[0x966a,0xe100,18],[0x968b,0xe121,30],[0x96a9,0xe0c0,63],[0x96a9,0xe140,18],[0x96ca,0xe161,30],[0x954a,0xd980,54],[0x954a,0xda00,54],[0x954a,0xda80,54],[0x9580,0xd9c0,54],[0x9580,0xda40,54],[0x9580,0xdac0,54],[0x96e8,0xe112,15],[0x96f7,0xe152,15],[0x95b6,0xd9b6,9],[0x95c8,0xda36,9],[0x95da,0xdab6,9],[0x95bf,0xd9f6,9],[0x95d1,0xda76,9],[0x95e3,0xdaf6,9]]) assert.deepStrictEqual(m.slice(dst,dst+n),m.slice(src,src+n));
}
console.log('OK - first-load setup graphics and patched flag operand with callbacks stubbed');
