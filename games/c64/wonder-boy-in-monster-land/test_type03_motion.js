'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[13,0x93db],[14,0xa239],[15,0xa693],[17,0x9c8a],[18,0xa385],[24,0x95fb],[26,0xa7fc],[27,0xac50]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const motion of [0xfb,0xfa,0xf6,0xf5,5,9,10]){const m=original.slice();m[0x1ad4]=motion;m.fill(0,0x10,0x14);m.set([0x85,0x12,0xe6,0x10,0x60],0x43f0);m.set([0x85,0x13,0xe6,0x11,0x60],0x43a2);const cpu=new CPU(m);cpu.x=1;cpu.pc=d+0xa1;cpu.run({until:d+0xd3,maxSteps:100});const neg=!!(motion&128),value=neg?256-motion-6:motion-5,called=value>=0,clamp=value>=5,arg=clamp?4:value;assert.deepEqual([...m.slice(0x10,0x14)],neg&&called?[1,0,arg,0]:called?[0,1,0,arg]:[0,0,0,0]);assert.equal(m[0x1ad4],clamp?(neg?0xf7:9):motion)}
}
console.log('OK - type-$03 asymmetric horizontal arithmetic in eight loads');
