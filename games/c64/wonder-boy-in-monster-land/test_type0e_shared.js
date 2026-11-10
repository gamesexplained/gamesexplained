'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[9,0xbb15],[11,0x9e47],[20,0xbb6b]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [hit,positive,face,other] of [[0,1,0,0],[0,1,0,1],[1,1,0,0],[1,1,1,0],[1,0,0,0],[1,128,0,0]]){
  const m=original.slice();m[0x1a6e]=positive;m[0x1b29]=0x80;m[0x19e6]=0x30;m[0x1ab2]=1;m[d+0x162]=0;m.fill(0,0x10,0x14);
  m.set([0xe6,0x10,0x60],0x792c);m.set([0xe6,0x11,hit?0x38:0x18,0x60],0x732a);m.set([other?0x38:0x18,0x60],0x7227);m.set([face?0x38:0x18,0x60],0x72fc);m.set([0x85,0x13,0xe6,0x12,0x60],0x5d7a);
  const start=d+0x3e;m.set([0x20,start&255,start>>8,0xea],0x02f0);const target=hit?0x02f3:d+0x41,cpu=new CPU(m);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.deepEqual([...m.slice(0x10,0x12)],[1,1]);
  if(!hit)assert.deepEqual([...m.slice(0x12,0x14)],other?[1,8]:[0,0]);
  else if(positive>0&&positive<128){assert.equal(m[0x1b29],face?128:0);assert.equal(m[0x1ab2],4);assert.equal(m[0x1ae5],10);assert.equal(m[0x19c4],0x34+(face?6:0))}
  else{assert.equal(m[0x1ab2],5);assert.equal(m[0x1ac3],10);assert.equal(m[0x1a90],255);assert.equal(m[0x19c4],0x34)}
 }
}
console.log('OK - type-$0E shared collision paths in loads 9, 11 and 20');
