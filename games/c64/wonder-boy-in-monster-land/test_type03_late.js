'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[13,0x93db],[14,0xa239],[15,0xa693],[17,0x9c8a],[18,0xa385],[24,0x95fb],[26,0xa7fc],[27,0xac50]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [state,effect,direction,base] of [[1,0,0,0],[1,1,0,0x20],[1,1,0x80,0x20],[1,1,0x80,0xf0],[2,0,0,0]]){
  const m=original.slice();m[0x1a90]=effect;m[0x1ac3]=direction;m[0x19e6]=base;m[0x1ab2]=state;m.fill(0,0x10,0x14);m.set([0xe6,0x10,0x60],0x45bc);m.set([0xe6,0x11,0x60],0x4574);m.set([0x85,0x13,0xe6,0x12,0x60],0x4b20);m[0x5db9]=0x60;
  new CPU(m).call(d+(state===1?0x11d:0x157),{x:1});
  if(state===2)assert.deepEqual([...m.slice(0x10,0x14)],[0,0,1,2]);
  else if(!effect){assert.deepEqual([...m.slice(0x10,0x14)],[0,0,0,0]);assert.equal(m[0x1ab2],0)}
  else{const left=!!(direction&128),right=!left||((base+16)&255)===0,frame=(base+(right?6:16))&255;assert.deepEqual([...m.slice(0x10,0x14)],[+left,+right,0,0]);assert.equal(m[0x1ad4],0);assert.equal(m[0x19c4],frame);assert.equal(m[0x19d5],(frame+2)&255)}
 }
}
console.log('OK - type-$03 states 1 and 2 in eight loads');
