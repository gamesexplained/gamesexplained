'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[12,0xa325],[23,0xb148]]){
 const m=base.slice(),file=path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json');
 for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7ef0]|m[0x7f20]<<8,d);
 for(const [timer,face,result] of [[0,0,2],[2,0,2],[2,1,2],[2,0,0],[2,1,0],[128,1,0]]){
  const a=m.slice();a[0x1ac3]=timer;a[0x1ae5]=3;a[0x1ab2]=4;a.set([face?0x38:0x18,0x60],0x72fc);a.set([0xe6,0x10,0xa9,result,0x60],0x45bc);a.set([0xe6,0x11,0xa9,result,0x60],0x4574);a.set([0x20,(d+0x1de)&255,(d+0x1de)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:50});const after=(timer-1)&255;assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ac3],after);assert.equal(a[0x1ab2],(after&128)||(result&6)!==2?3:4);assert.deepEqual([a[0x10],a[0x11]],after&128?[0,0]:face?[0,1]:[1,0]);
 }
 for(const [timer,index,direction,pos] of [[0,0,0,250],[2,0,0,250],[2,3,128,250],[2,3,0,1]]){
  const a=m.slice();a[0x1ac3]=timer;a[0x1ad4]=index;a[0x1b18]=direction;a[0x19e6]=pos;a[0x19c4]=77;a.set([0x85,0x10,0x60],0x4b0e);a.set([0x20,(d+0x201)&255,(d+0x201)>>8,0xea],0x02f0);const after=(timer-1)&255,target=after&128?0x5db9:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.equal(a[0x1ac3],after);assert.equal(a[0x10],after&128?0x60:0);if(!(after&128)){assert.equal(a[0x19c4],(pos+[6,6,8,8][index]+(direction&128?0:10))&255);assert.equal(a[0x1ad4],(index+1)%4);assert.equal(a[d+0x27f],direction);}
 }
 for(const [state,offset] of [0x1e,0xb1,0x153,0x19f,0x1de,0x201].entries()){
  const a=m.slice(),target=d+offset;a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:20});
  assert.equal(cpu.pc,target);assert.equal(a[d+16]|a[d+17]<<8,target);
 }
}
console.log('OK - type-$11 vectors and six patched jump targets in loads 12 and 23');
