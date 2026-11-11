'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[25,0x9f28]]){
 const m=base.slice(),file=path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json');
 for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7efd]|m[0x7f2d]<<8,d);
 for(const [timer,face,result] of [[0,0,2],[2,0,2],[2,1,2],[2,0,0],[2,1,0],[128,1,0]]){
  const a=m.slice();a[0x1ac3]=timer;a[0x1ae5]=3;a[0x1ab2]=4;a.set([face?0x38:0x18,0x60],0x72fc);a.set([0xe6,0x10,0xa9,result,0x60],0x45bc);a.set([0xe6,0x11,0xa9,result,0x60],0x4574);a.set([0x20,(d+0x1de)&255,(d+0x1de)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:50});const after=(timer-1)&255;assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ac3],after);assert.equal(a[0x1ab2],(after&128)||(result&6)!==2?3:4);assert.deepEqual([a[0x10],a[0x11]],after&128?[0,0]:face?[0,1]:[1,0]);
 }
 for(const [timer,index,direction,pos] of [[0,0,0,250],[2,0,0,250],[2,3,128,250],[2,3,0,1]]){
  const a=m.slice();a[0x1ac3]=timer;a[0x1ad4]=index;a[0x1b18]=direction;a[0x19e6]=pos;a[0x19c4]=77;a.set([0x85,0x10,0x60],0x4b0e);a.set([0x20,(d+0x201)&255,(d+0x201)>>8,0xea],0x02f0);const after=(timer-1)&255,target=after&128?0x5db9:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.equal(a[0x1ac3],after);assert.equal(a[0x10],after&128?0x80:0);if(!(after&128)){assert.equal(a[0x19c4],(pos+[6,6,8,8][index]+(direction&128?0:10))&255);assert.equal(a[0x1ad4],(index+1)%4);assert.equal(a[d+0x27f],direction);}
 }
 for(const [hit,value,carry,direction] of [[0,1,0,0],[0,1,1,0],[1,1,0,0],[1,1,0,128],[1,0,0,0],[1,128,0,128]]){
  const a=m.slice();a[0x1ab2]=2;a[0x1a6e]=value;a[0x1ad4]=33;a[0x1ac3]=44;a[0x1ae5]=55;a[0x1b18]=direction;a[0x19e6]=250;a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x732a);a.set([carry?0x38:0x18,0x60],0x7227);a.set([0x85,0x10,0x60],0x5d7a);a.set([0x20,(d+0x153)&255,(d+0x153)>>8,0xea],0x02f0);const target=hit?0x02f3:d+0x156,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:80});const positive=value>0&&value<128;assert.equal(cpu.pc,target);assert.equal(a[0x1ab2],hit?(positive?4:5):2);assert.equal(a[0x1ac3],hit?10:44);assert.equal(a[0x1ae5],hit&&positive?2:55);assert.equal(a[0x1ad4],hit&&!positive?0:33);assert.equal(a[0x10],!hit&&carry?4:0);if(hit&&positive)assert.equal(a[0x19c4],(250+4+(direction&128?0:10))&255);
 }
 for(const [state,timer,index,direction,result] of [[2,0,0,0,2],[2,2,3,128,2],[2,2,1,0,0],[3,0,0,0,2],[3,2,3,128,2],[3,2,1,0,0]]){
  const a=m.slice();a[0x1ab2]=state;a[0x1ad4]=timer;a[0x1af6]=index;a[0x1b18]=direction;a[0x19e6]=250;a[d+0x239]=0x60;a.set([0xe6,0x10,0xa9,result,0x60],0x45bc);a.set([0xe6,0x11,0xa9,result,0x60],0x4574);const start=d+(state===2?0x153:0x19f);a.set([0x20,start&255,start>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:90});const after=(timer-1)&255,transition=!!(after&128)||(result&6)!==2;assert.equal(cpu.pc,0x02f3);assert.equal(a[0x19c4],(250+[2,2,4,4][index]+(direction&128?0:10))&255);assert.equal(a[0x1af6],(index+1)%4);assert.equal(a[0x1ab2],transition?(state===2?3:0):state);assert.equal(a[0x1ad4],transition&&state===2?255:after);assert.equal(a[0x1b18],transition&&state===2?direction^128:direction);assert.deepEqual([a[0x10],a[0x11]],after&128?[0,0]:direction&128?[0,1]:[1,0]);
 }
 for(const [delay,timer] of [[2,0],[0,2],[0,0],[0,128],[0,133],[0,134]]){
  const a=m.slice();a[0x1af6]=delay;a[0x1b07]=timer;a[0x1ab2]=1;a[d+0x239]=0x60;a.set([0xe6,0x10,0x60],d+0xf1);a.set([0xe6,0x11,0x60],0x4342);a.set([0xe6,0x12,0x60],0x4368);a.set([0x20,(d+0xb3)&255,(d+0xb3)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:80});const expect=delay?timer:timer&&timer<128?timer-1:timer===0?129:timer<134?timer+1:timer;assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1af6],delay?delay-1:0);assert.equal(a[0x1b07],expect);assert.equal(a[0x1ab2],!delay&&timer>=134?0:1);assert.deepEqual([a[0x10],a[0x11],a[0x12]],[!delay&&timer===0?1:0,!delay&&timer>0&&timer<128?1:0,!delay&&(timer===0||timer>=128)?1:0]);
 }
 for(const success of [0,1]){
  const a=m.slice();a[0x1b29]=7;a.set([success?0x38:0x18,0x60],0x190b);a.set([0xa2,2,0x60],0x447a);const fields=[0x194c,0x193b,0x1990,0x197f,0x1b17,0x19e5];fields.forEach((addr,i)=>a[addr+1]=30+i);a.set([0x20,(d+0xf1)&255,(d+0xf1)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1b29],success?1:7);if(success){fields.slice(0,4).forEach((addr,i)=>assert.equal(a[addr+2],30+i));for(const [addr,val] of [[0x1ae4,34^128],[0x1919,45],[0x19f6,1],[0x1a07,3],[0x1aa0,0],[0x19c3,215],[0x19e5,215],[0x1ac2,4],[0x1af5,7],[0x1b06,10],[0x1ad3,1]])assert.equal(a[addr+2],val);assert.equal(cpu.x,1);}
 }
 for(const [distance,busy,slot,face] of [[5,0,1,0],[50,0,1,0],[5,1,1,1],[5,255,1,0],[50,0,0,0]]){
  const a=m.slice();a[0x1ab2]=0;a[0x1b29]=busy;a[0x1a2a]=slot;a[0x1b18]=0;a[0x19e6]=30;a[0x1af6]=77;a[0x1b07]=88;a[0x1ad4]=99;a[0x6f3c]=distance;a[d+0x239]=0x60;a.set([face?0x38:0x18,0x60],0x72fc);a.set([0xa9,1,0x60],0x71db);a.set([0xa9,1,0x60],0x3020);a.set([0x20,(d+0x1e)&255,(d+0x1e)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:120});const close=distance<21&&(!busy||(busy&128));assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ab2],close?1:slot?2:0);assert.equal(a[0x1af6],close?5:slot?0:77);assert.equal(a[0x1b07],close?6:88);assert.equal(a[0x1ad4],!close&&slot?10:99);if(!close&&slot)assert.equal(a[d+0x18d],10);
 }
 {const a=m.slice();a[d+0x18d]=10;a[d+0x239]=0x60;a[0x1ab2]=2;a[0x1ad4]=0;a[0x1af6]=0;a[0x1b18]=0;a.set([0x20,(d+0x153)&255,(d+0x153)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:80});assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ad4],10);assert.equal(a[0x1ab2],3);}
 for(const [state,offset] of [0x1e,0xb3,0x153,0x19f,0x1de,0x201].entries()){
  const a=m.slice(),target=d+offset;a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:20});
  assert.equal(cpu.pc,target);assert.equal(a[d+16]|a[d+17]<<8,target);
 }
}
console.log('OK - type-$1E vectors and six patched jump targets and state paths in load 25');
