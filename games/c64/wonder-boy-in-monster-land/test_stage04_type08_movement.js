'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-04'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const sign of [0,128])for(const carry of [0,1]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,carry?0x38:0x18,0x60],0x4574);m.set([0x85,0x12,0xe6,0x13,carry?0x38:0x18,0x60],0x45bc);m.fill(0,0x10,0x14);m[0x1b07]=7;m[0x1ac3]=sign|5;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xb5d0;cpu.run({until:0xb5e5,maxSteps:30});assert.equal(cpu.pc,0xb5e5);assert.deepEqual([...m.slice(0x10,0x14)],sign?[0,0,7,1]:[7,1,0,0]);assert.equal(m[0x1ac3],(sign|5)^(carry?128:0));
}
console.log('OK - load 4 type-$08 movement direction and carry');
