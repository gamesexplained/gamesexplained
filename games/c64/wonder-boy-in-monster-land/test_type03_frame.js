'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[13,0x93db],[14,0xa239],[15,0xa693],[17,0x9c8a],[18,0xa385],[24,0x95fb],[26,0xa7fc],[27,0xac50]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [face,tick,motion,base] of [[1,0,0,0x20],[1,0,128,0x20],[1,1,5,0x20],[0,0,0,0x20],[0,0,1,0xfa],[0,1,128,0x20]]){
  const m=original.slice();m[0x1b29]=tick;m[0x1ad4]=motion;m[0x19e6]=base;m.set([face?0x38:0x18,0x60],0x72fc);const cpu=new CPU(m);cpu.x=1;cpu.pc=d+0x4f;cpu.run({until:d+0xa1,maxSteps:100});let v=motion;
  if(!(tick&1)){if(face)v=motion&128?0:(motion+1)&255;else if(!motion||motion&128){v=(motion-1)&255;if(!(v&128))v=0}else v=0}
  const f=(base+(face?0:10))&255,second=(f+((((tick-1)&255)>>1)&2)+2)&255;assert.equal(m[0x1ad4],v);assert.equal(m[0x1b29],(tick-1)&255);assert.equal(m[0x19c4],f);assert.equal(m[0x19d5],second);
 }
}
console.log('OK - type-$03 state-0 frames in eight loads');
