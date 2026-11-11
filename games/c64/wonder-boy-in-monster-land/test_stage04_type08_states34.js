'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-04'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [active,sign,frame] of [[0,0,9],[1,0,250],[0,128,250],[1,128,9]]){
 const m=base.slice();m[0x1a90]=active;m[0xb692]=7;m[0xb693]=sign;m[0x1ab2]=3;m[0x19e6]=frame;const target=sign?0x43f0:0x43a2,cpu=new CPU(m);cpu.x=1;cpu.pc=0xb5f2;cpu.run({until:target,maxSteps:40});assert.equal(cpu.pc,target);assert.equal(m[0x1ab2],active?3:7);assert.equal(m[0x19c4],(frame+8)&255);assert.equal(m[0x19d5],(frame+10)&255);assert.equal(cpu.a,10);
}
for(const timer of [0,1,128,255]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x4b20);m[0x10]=m[0x11]=0;m[0x1ac3]=timer;m[0x19e6]=250;const result=(timer-1)&255,target=result&128?0x5db9:0xb62d,cpu=new CPU(m);cpu.x=1;cpu.pc=0xb619;cpu.run({until:target,maxSteps:40});assert.equal(cpu.pc,target);assert.equal(m[0x1ac3],result);assert.deepEqual([...m.slice(0x10,0x12)],result&128?[2,1]:[0,0]);if(!(result&128)){assert.equal(m[0x19c4],2);assert.equal(m[0x19d5],4);}
}
console.log('OK - load 4 type-$08 states 3 and 4, direction and timer');
