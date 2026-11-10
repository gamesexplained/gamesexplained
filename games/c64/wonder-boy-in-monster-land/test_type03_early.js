'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[13,0x93db],[14,0xa239],[15,0xa693],[17,0x9c8a],[18,0xa385],[24,0x95fb],[26,0xa7fc],[27,0xac50]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [active,hit,sign,face,other] of [[0,0,0,0,0],[1,1,1,0,0],[1,1,1,1,0],[1,1,0,0,0],[1,1,128,0,0],[1,0,0,0,1],[1,0,0,0,0]]){
  const m=original.slice();m[0x1a2a]=active;m[0x1a6e]=sign;m[0x1ab2]=0;m.fill(0,0x10,0x15);m.set([0xe6,0x10,0x60],0x792c);m.set([0xe6,0x11,hit?0x38:0x18,0x60],0x732a);m.set([face?0x38:0x18,0x60],0x72fc);m.set([other?0x38:0x18,0x60],0x7227);m.set([0x85,0x14,0xe6,0x12,0x60],0x5d7a);
  const target=d+(!active?0xf4:hit?0x40:0x4f),cpu=new CPU(m);cpu.x=1;cpu.pc=d+0x18;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);
  if(!active)assert.deepEqual([...m.slice(0x10,0x15)],[0,0,0,0,0]);else{assert.deepEqual([...m.slice(0x10,0x12)],[1,1]);if(hit){assert.equal(m[0x1ab2],sign===1?1:2);if(sign===1)assert.equal(m[0x1ac3],face?1:255)}else{assert.equal(m[0x12],other);assert.equal(m[0x14],other?8:0)}}
 }
}
console.log('OK - type-$03 state-0 entry branches in eight loads');
