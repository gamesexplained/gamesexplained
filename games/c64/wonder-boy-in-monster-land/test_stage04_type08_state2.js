'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-04'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const phase of [0,4,5,10,11,255]){
 const m=base.slice();m.set([0xe6,0x12,0x60],0xb646);m.set([0x85,0x10,0xe6,0x11,0x60],0xb636);m.set([0x85,0x13,0xe6,0x14,0x60],0x4368);m.fill(0,0x10,0x15);m[0x1ad4]=phase;m[0x1ab2]=2;const target=phase===11?0xb5f1:0xb5d0,cpu=new CPU(m);cpu.x=1;cpu.pc=0xb5b4;cpu.run({until:target,maxSteps:50});assert.equal(cpu.pc,target);assert.deepEqual([...m.slice(0x10,0x15)],[...(phase<5?[4,1]:[0,0]),1,...(phase===11?[0,0]:[phase,1])]);assert.equal(m[0x1ad4],phase===11?phase:(phase+1)&255);assert.equal(m[0x1ab2],phase===11?0:2);
}
console.log('OK - load 4 type-$08 state 2 phase boundaries');
