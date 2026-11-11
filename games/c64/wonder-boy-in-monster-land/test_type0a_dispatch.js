'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[6,0xb504],[19,0xb966],[28,0xa62e]]){
 const m=base.slice(),file=path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json');
 for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7ee9]|m[0x7f19]<<8,d);
 for(const [state,timer,sign] of [[3,1,0],[3,1,128],[3,0,0],[3,128,128],[4,1,0],[4,0,0],[4,128,0]]){
  const a=m.slice();a[0x1ab2]=state;a[0x1b18]=timer;a[0x1ac3]=timer;a[0x1ad4]=3;a[0x1b29]=2;a[d+0x182]=sign;a.set([0xe6,0x10,0x60],0x4574);a.set([0xe6,0x11,0x60],0x45bc);a.set([0x85,0x12,0x60],0x4b0e);const start=d+(state===3?0xe6:0x107);a.set([0x20,start&255,start>>8,0xea],0x02f0);const after=(timer-1)&255,target=state===4&&(after&128)?0x5db9:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:40});assert.equal(cpu.pc,target);assert.equal(a[0x1ab2],state===3&&(after&128)?2:state);assert.equal(a[0x1ad4],state===3&&(after&128)?131:3);assert.equal(a[state===3?0x1b18:0x1ac3],after);assert.deepEqual([a[0x10],a[0x11],a[0x12]],state===4&&(after&128)?[0,0,80]:state===3&&!(after&128)?(sign?[0,1,0]:[1,0,0]):[0,0,0]);
 }
 for(const [hit,value,carry,face] of [[0,1,0,0],[0,1,1,0],[1,1,0,0],[1,1,0,1],[1,0,0,0],[1,128,0,1]]){
  const a=m.slice();a[0x1ab2]=0;a[0x1a6e]=value;a[0x1ad4]=33;a[0x1ac3]=44;a[0x1a90]=55;a[0x1b18]=66;a[d+0x182]=5;a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x732a);a.set([carry?0x38:0x18,0x60],0x7227);a.set([face?0x38:0x18,0x60],0x72fc);a.set([0x85,0x10,0x60],0x5d7a);a.set([0x20,(d+0x1c)&255,(d+0x1c)>>8,0xea],0x02f0);const target=hit?0x02f3:d+0x1f,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:70});const positive=value>0&&value<128;assert.equal(cpu.pc,target);assert.equal(a[0x1b29],0);assert.equal(a[0x1ab2],hit?(positive?3:4):0);assert.equal(a[0x1ad4],hit&&positive?(face?130:2):33);assert.equal(a[0x1b18],hit&&positive?8:66);assert.equal(a[0x1ac3],hit&&!positive?10:44);assert.equal(a[0x1a90],hit&&!positive?255:55);assert.equal(a[0x10],!hit&&carry?4:0);
 }
 for(const value of [0,0x9b,0xff]){const a=m.slice();a[0x1ab2]=0;a[d+0x13b]=0x60;a.set([0xa9,value,0x60],0x3020);a.set([0x20,(d+0x1c)&255,(d+0x1c)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:60});assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ac3],value&15);assert.equal(a[0x1ad4],value&128);assert.equal(a[0x1ae5],3);assert.equal(a[0x1ab2],1);}
 for(const [delay,timer,direction,result,rng] of [[2,0,0,2,0],[0,2,0,2,0],[0,2,128,2,0],[0,2,0,0,0],[0,0,0,2,0],[0,0,0,2,128]]){
  const a=m.slice();a[0x1ab2]=1;a[0x1ae5]=delay;a[0x1ac3]=timer;a[0x1ad4]=direction;a[d+0x13b]=0x60;a[d+0x115]=0x60;a.set([0xa9,rng,0x60],0x3020);a.set([0xe6,0x10,0xa9,result,0x60],0x4574);a.set([0xe6,0x11,0xa9,result,0x60],0x45bc);a.set([0x20,(d+0x39)&255,(d+0x39)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:80});const after=(timer-1)&255,state=delay?1:after&128?(rng&128?2:0):(result&6)===2?1:0;assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ab2],state);assert.equal(a[0x1ae5],delay?delay-1:state===2?4:0);assert.equal(a[0x1ac3],delay?timer:after);assert.deepEqual([a[0x10],a[0x11]],delay||after&128?[0,0]:direction&128?[0,1]:[1,0]);if(state===2){assert.equal(a[0x1af6],8);assert.equal(a[0x1ad4],128);}
 }
 for(const [timer,direction,pos] of [[0,0,250],[1,128,250],[2,0,10],[255,128,10]]){const a=m.slice();a[0x1b07]=timer;a[0x1ad4]=direction;a[0x19e6]=pos;a.set([0x20,(d+0x115)&255,(d+0x115)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:50});const tick=(timer+1)&255,v=tick<3?tick:0;assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1b07],v);assert.equal(a[d+0x182],direction);assert.equal(a[0x19c4],(pos+v*2+(direction&128?6:0))&255);}
 for(const [delay,timer,direction,contact,detect] of [[2,0,0,0,0],[0,2,0,0,0],[0,2,128,1,0],[0,0,0,0,1],[0,0,0,0,0],[0,128,0,0,0],[0,139,0,0,0],[0,140,0,0,0]]){
  const a=m.slice();a[0x1ab2]=2;a[0x1ae5]=delay;a[0x1af6]=timer;a[0x1ad4]=direction;a[d+0x13b]=0x60;a[d+0x115]=0x60;a.set([0xe6,0x10,0x60],0x4342);a.set([0xe6,0x11,contact?0x38:0x18,0x60],0x4574);a.set([0xe6,0x12,contact?0x38:0x18,0x60],0x45bc);a.set([detect?0x38:0x18,0x60],0x44de);a.set([0x20,(d+0x8b)&255,(d+0x8b)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:80});let v=delay?timer:timer>0&&timer<128?timer-1:timer===0?128:timer;if(!delay&&(v&128)&&v<140&&!(timer===0&&detect))v++;const transition=!delay&&timer===0&&detect,called=!delay&&((timer>0&&timer<128)||(timer===0&&!detect)||timer>=128);assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ab2],transition?0:2);assert.equal(a[0x1af6],v);assert.equal(a[0x1ae5],delay?delay-1:0);assert.equal(a[0x1ad4],!delay&&timer>0&&timer<128&&contact?direction^128:direction);assert.deepEqual([a[0x10],a[0x11],a[0x12]],called?[timer>0&&timer<128?1:0,direction&128?0:1,direction&128?1:0]:[0,0,0]);
 }
 for(const [state,offset] of [0x1c,0x39,0x8b,0xe6,0x107].entries()){
  const a=m.slice(),target=d+offset;a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:20});
  assert.equal(cpu.pc,target);assert.equal(a[d+16]|a[d+17]<<8,target);
 }
}
console.log('OK - type-$0A vectors and five patched targets and state paths in loads 6, 19 and 28');
