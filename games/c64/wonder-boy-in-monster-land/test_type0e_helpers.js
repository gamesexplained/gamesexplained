'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[9,0xbb15],[11,0x9e47],[20,0xbb6b]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [kind,value,carry] of [['init',4,0],['init',5,0],['move',0,0],['move',128,0],['move',0,1],['move',128,1]]){
  const m=original.slice();m[0x6f3c]=m[0x1b29]=value;m[0x1ab2]=0;m[0x1ac3]=6;m[0x19e6]=0x30;m.fill(0,0x10,0x12);m[d+0xf9]=0x60;m.set([0xa2,5,0xa9,1,0x60],0x71db);
  for(const [a,z] of [[0x4574,0x10],[0x45bc,0x11]])m.set([0xe6,z,carry?0x38:0x18,0x60],a);
  new CPU(m).call(d+(kind==='init'?0x1e:0xa5),{x:1});
  if(kind==='init'){const direction=value<5?0xfa:0;assert.equal(m[d+0x2c],5);assert.equal(m[0x1b29],direction);assert.equal(m[0x1ab2],1);assert.equal(m[0x1ac3],5);assert.equal(m[0x19c4],(0x30+6+direction)&255)}
  else{assert.deepEqual([...m.slice(0x10,0x12)],value&128?[0,1]:[1,0]);assert.equal(m[0x1b29],carry?value^0xfa:value)}
 }
}
console.log('OK - type-$0E state 0 and movement helper in loads 9, 11 and 20');
