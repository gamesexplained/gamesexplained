'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[9,0xbb15],[11,0x9e47],[20,0xbb6b]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [state,timer,direction] of [[4,0,0],[4,2,0],[4,2,128],[5,0,0],[5,2,0]]){
  const m=original.slice();m[0x1ae5]=m[0x1ac3]=timer;m[0x1b29]=direction;m[0x1ab2]=state;m.fill(0,0x10,0x14);
  for(const [a,z] of [[0x4574,0x10],[0x45bc,0x11],[0x4b0e,0x12],[0x5db9,0x13]])m.set([0xe6,z,0x60],a);
  new CPU(m).call(d+(state===4?0xb8:0xd6),{x:1});
  const expected=state===4&&timer===0||state===5&&timer===2?[0,0,0,0]:state===4&&direction===128?[1,0,0,0]:state===4?[0,1,0,0]:[0,0,1,1];
  assert.deepEqual([...m.slice(0x10,0x14)],expected);assert.equal(m[state===4?0x1ae5:0x1ac3],(timer-1)&255);if(state===4&&timer===0)assert.equal(m[0x1ab2],0);
 }
}
console.log('OK - type-$0E states 4 and 5 in loads 9, 11 and 20');
