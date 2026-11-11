'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[2,0xbe7e],[4,0xb6a6],[6,0xb912],[14,0xa733],[15,0xaa9c],[17,0xa093],[24,0xa0fa],[25,0xa37d]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const counter of [0,1,2,3]){const m=original.slice();m[0x1ac3]=counter;m[0x1ad4]=5;m[0x1b2d]=77;m[0x19e6]=0xfe;m[0x19c4]=0x55;m.fill(0,0x10,0x12);m.set([0x86,0x11,0xe6,0x10,0x60],0x4454);new CPU(m).call(d+0x91,{x:1});
  if(counter<2){assert.equal(m[0x1ac3],counter+1);assert.equal(m[0x19c4],(counter*2+0xfe)&255);assert.equal(m[0x1b2d],77);assert.equal(m[0x10],0)}else{assert.equal(m[0x1ac3],counter);assert.equal(m[0x1b2d],0);assert.deepEqual([...m.slice(0x10,0x12)],[1,1])}
 }
}
console.log('OK - type-$22 state 2 and alternate-slot cleanup in eight loads');
