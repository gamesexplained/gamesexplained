'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[12,0xa5bb],[23,0xb3de]]){
 const m=base.slice(),file=path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json');
 for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7f05]|m[0x7f35]<<8,d);
 for(const [timer,hit,carry,pos] of [[2,0,0,1],[1,0,1,1],[0,0,0,100],[128,1,1,100]]){
  const a=m.slice();a[0x1ac3]=timer;a[0x1ad4]=3;a[0x1b2b]=9;a[0x19c4]=pos;a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x1179);a.set([carry?0x38:0x18,0x60],0x7227);a.set([0xe6,0x10,0x60],0x5d7a);const after=(timer-1)&255,target=after&128?0x4454:d+0xb3,cpu=new CPU(a);cpu.x=1;cpu.pc=d+0x93;cpu.run({until:target,maxSteps:40});assert.equal(cpu.pc,target);assert.equal(a[0x1ac3],after);assert.equal(a[0x10],!hit&&carry?1:0);assert.equal(a[0x19c4],after&128?pos:(pos-2)&255);assert.equal(a[0x1b2b],after&128?8:9);if(after&128){assert.equal(a[d+0xbf],1);assert.equal(cpu.x,1);}
 }
 for(const [pre,hit,timer,detect,motion,anim,direction,collide] of [[1,0,5,0,0,0,0,0],[0,1,5,0,0,0,0,0],[0,0,2,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,0],[0,0,0x87,0,0,0,0,0],[0,0,0x88,0,1,0,0,1],[0,0,0x80,0,1,1,0x80,1],[0,0,0x80,0,1,1,0x80,0]]){
  const a=m.slice();a[0x1ac3]=timer;a[0x1ab2]=0;a[0x1af6]=motion;a[0x1b07]=anim;a[0x1ae5]=direction;a[0x792c]=0x60;a.set([pre?0x38:0x18,0x60],0x1179);a.set([hit?0x38:0x18,0x60],0x7227);a.set([0xe6,0x10,0x60],0x5d7a);a.set([0xe6,0x11,0x60],0x4342);a.set([detect?0x38:0x18,0x60],0x44de);a.set([0xe6,0x12,collide?0x38:0x18,0x60],0x45bc);a.set([0xe6,0x13,collide?0x38:0x18,0x60],0x4574);a.set([0x20,(d+0x16)&255,(d+0x16)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});
  const transition=pre||hit||(!timer&&detect);let v=transition?2:timer&&timer<128?timer-1:timer===0?128:timer;if(!transition&&(v&128)&&v<136)v++;assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ac3],v);assert.equal(a[0x1ab2],transition?1:0);assert.deepEqual([a[0x10],a[0x11]],[hit,!pre&&!hit&&timer>0&&timer<128?1:0]);if(!transition&&motion){assert.equal(a[0x1b07],anim===0?2:anim-1);assert.equal(a[0x1af6],anim===0?motion-1:motion);assert.equal(a[0x1ae5],collide?direction^255:direction);}
 }
 for(const [state,offset] of [0x16,0x93].entries()){
  const a=m.slice(),target=d+offset;a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:20});
  assert.equal(cpu.pc,target);assert.equal(a[d+16]|a[d+17]<<8,target);
 }
}
console.log('OK - type-$26 vectors, two captured targets and both state paths in loads 12 and 23');
