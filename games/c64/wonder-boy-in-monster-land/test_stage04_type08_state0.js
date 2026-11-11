'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-04'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const value of [0,1,2,3,255]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0xb646);m.set([0x85,0x11,0xe6,0x12,0x60],0xb636);m.set([0xa9,value,0x60],0x3020);m.fill(0,0x10,0x13);m[0x1ab2]=m[0x1ac3]=m[0x1ad4]=m[0x1b07]=0;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xb50f;cpu.run({until:0xb530,maxSteps:60});assert.equal(cpu.pc,0xb530);assert.deepEqual([...m.slice(0x10,0x13)],[1,4,1]);assert.deepEqual([m[0x1ac3],m[0x1ad4],m[0x1b07],m[0x1ab2]],[value,10,4+(value&3),1]);
}
console.log('OK - load 4 type-$08 state 0 initialization');
