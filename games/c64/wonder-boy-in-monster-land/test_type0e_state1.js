'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[9,0xbb15],[11,0x9e47],[20,0xbb6b]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [direction,result] of [[0,2],[128,2],[0,0],[128,0]]){
  const m=original.slice();m[0x1b29]=direction;m[0x1ab2]=1;m[0x1ac3]=6;m[0x19e6]=0x30;m.fill(0,0x10,0x12);m[d+0xf9]=0x60;
  for(const [a,z] of [[0x4574,0x10],[0x45bc,0x11]])m.set([0xe6,z,0xa9,result,0x60],a);
  new CPU(m).call(d+0x3e,{x:1});assert.deepEqual([...m.slice(0x10,0x12)],direction?[0,1]:[1,0]);
  assert.equal(m[0x1ac3],5);assert.equal(m[0x19c4],(0x30+6+direction)&255);
  if(result===0){assert.equal(m[0x1ad4],7);assert.equal(m[0x1ab2],2);assert.equal(m[0x1b29],direction^0xfa)}else assert.equal(m[0x1ab2],1);
 }
}
console.log('OK - type-$0E state 1 movement and frame updates in loads 9, 11 and 20');
