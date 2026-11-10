'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d,helper] of [[6,0xb688,0xb895],[7,0x9c46,0x9e53],[22,0xa25b,0xa468],[30,0xb359,0xb566]]){
 const m=base.slice(),file=path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json');
 for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7eea]|m[0x7f1a]<<8,d);
 for(const [effect,hit,value,face,follow] of [[0,0,1,0,0],[1,1,1,1,1],[0,1,1,0,0],[0,1,1,1,0],[0,1,0,0,0],[0,1,128,1,0]]){
  const a=m.slice();a[0x1ab2]=2;a[0x1a90]=effect;a[0x1a6e]=value;a[0x1ac3]=44;a[0x1b29]=55;a[helper+0x6c]=5;a[helper+0x5c]=77;a.set([face?0x38:0x18,0x60],0x72fc);a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x732a);a.set([follow?0x38:0x18,0x60],0x7227);a.set([0x85,0x10,0x60],0x5d7a);const positive=value>0&&value<128,transition=effect===0&&hit,state=transition?(positive?5:6):2,target=d+[0x23,0x4b,0xe7,0x125,0x160,0x194,0x1ca][state],cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:80});assert.equal(cpu.pc,target);assert.equal(a[helper+0x6c],face?130:2);assert.equal(a[0x1ac3],transition&&!positive?10:face?130:2);assert.equal(a[0x1a90],transition&&!positive?255:effect);assert.equal(a[helper+0x5c],transition&&positive?2:77);assert.equal(a[0x1b29],transition&&positive?8:55);assert.equal(a[0x10],!transition&&follow?4:0);
 }
 for(const [state,timer,sign,pos] of [[5,2,0,250],[5,2,128,250],[5,0,0,2],[6,1,0,0],[6,0,0,0],[6,128,0,0]]){
  const a=m.slice();a[0x1ab2]=state;a[0x1b29]=timer;a[0x1ac3]=state===6?timer:sign;a[0x19e6]=pos;a[helper+0x5c]=3;a.set([0xe6,0x10,0x60],0x43f0);a.set([0xe6,0x11,0x60],0x43a2);a.set([0x85,0x12,0x60],0x4b20);const start=d+(state===5?0x194:0x1ca);a.set([0x20,start&255,start>>8,0xea],0x02f0);const after=(timer-1)&255,target=state===6&&(after&128)?0x5db9:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.equal(a[state===5?0x1b29:0x1ac3],after);assert.equal(a[0x1ab2],state===5&&(after&128)?3:state);if(state===5&&!(after&128)){const v=(pos+(sign&128?18:0)+10)&255;assert.equal(a[0x19c4],v);assert.equal(a[0x19d5],(v+2)&255);}assert.deepEqual([a[0x10],a[0x11],a[0x12]],state===6&&(after&128)?[0,0,3]:state===5&&!(after&128)?(sign&128?[1,0,0]:[0,1,0]):[0,0,0]);if(state===6&&(after&128))assert.equal(cpu.a,2);
 }
 for(const [state,offset] of [0x23,0x4b,0xe7,0x125,0x160,0x194,0x1ca].entries()){
  const a=m.slice(),target=d+offset;a[0x1ab2]=state;a[helper]=0x60;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:25});assert.equal(cpu.pc,target);assert.equal(a[d+19]|a[d+20]<<8,target);
 }
}
console.log('OK - type-$0B vectors and seven targets in loads 6, 7, 22 and 30');
