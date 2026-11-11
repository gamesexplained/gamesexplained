'use strict';
const assert=require('assert'), fs=require('fs'), path=require('path'), {CPU}=require('../../../kit/cpu/cpu6502.js');
const m=new Uint8Array(65536);
for(const p of ['resident','stage-01']) for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records) if(r.b)m.set(r.b,r.a);
m[0x46]=7; m[0xa850]=3; m[0xa851]=8; m[0xa807]=0x60; m.set([0x84,0x11,0xe6,0x10,0x60],0xa7ec);
const cpu=new CPU(m); cpu.pc=0xa63f; cpu.run({until:0xa67e,maxSteps:500}); assert.equal(cpu.pc,0xa67e);
for(const base of [0xd8f8,0xd90c]) for(let row=0;row<3;row++) for(let col=0;col<4;col++) assert.equal(m[base+row*40+col],9);
assert.equal(m[0xaba0],0); assert.equal(m[0xa800],8); assert.equal(m[0x10],2); assert.equal(m[0x11],0x87); assert.equal(cpu.x|cpu.y<<8,0xa857);
console.log('OK - first-load item layout and prompt with price callbacks stubbed');
