'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const timer of [0,1,128,255]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x4b20);m[0x10]=m[0x11]=0;m[0x1ac3]=timer;const result=(timer-1)&255,target=result&128?0x5db9:0x9de6;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9de1;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target);assert.equal(m[0x1ac3],result);assert.deepEqual([...m.slice(0x10,0x12)],result&128?[2,1]:[0,0]);if(result&128)assert.equal(cpu.a,2);
}
console.log('OK - load 3 type-$07 state 6 signed timer boundaries');
