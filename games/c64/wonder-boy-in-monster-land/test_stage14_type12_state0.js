'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const value of [0,1,2,3,255]){
 const m=base.slice();m.set([0xa9,value,0x60],0x3020);m[0x1ab2]=m[0x1ac3]=m[0x1ae5]=9;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xa5d4;cpu.run({until:0xa5ea,maxSteps:30});assert.equal(cpu.pc,0xa5ea);assert.deepEqual([m[0x1ab2],m[0x1ac3],m[0x1ae5]],[1,10,(value&3)*2]);
}
console.log('OK - load 14 type-$12 state 0 random mask and fall-through');
