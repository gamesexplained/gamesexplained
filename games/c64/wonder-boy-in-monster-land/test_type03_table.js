'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const expectedTable=[253,254,255,0,1,2,3,...Array(13).fill(4),3,2,1,0,255,254,253,...Array(13).fill(252)];
for(const [n,d] of [[13,0x93db],[14,0xa239],[15,0xa693],[17,0x9c8a],[18,0xa385],[24,0x95fb],[26,0xa7fc],[27,0xac50]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);assert.deepEqual([...original.slice(d+0xf5,d+0x11d)],expectedTable);
 for(const index of [0,3,10,39]){const m=original.slice();m[0x1ae5]=index;m.fill(0,0x10,0x14);m.set([0x85,0x12,0xe6,0x10,0x60],0x4342);m.set([0x85,0x13,0xe6,0x11,0x60],0x4368);const target=d+0xf4,cpu=new CPU(m);cpu.x=1;cpu.pc=d+0xd3;cpu.run({until:target,maxSteps:100});const v=expectedTable[index];assert.deepEqual([...m.slice(0x10,0x14)],v&128?[1,0,(-v)&255,0]:[0,1,0,v]);assert.equal(m[0x1ae5],index===39?0:index+1)}
}
console.log('OK - type-$03 signed movement table and bounded index cases in eight loads');
