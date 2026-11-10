'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[10,0x9fe3],[28,0xa7b6],[29,0xa3c7]]){
 const m=base.slice(),file=path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json');
 for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7eee]|m[0x7f1e]<<8,d);
 { const a=m.slice();a[0x1a90]=1;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:d+7,maxSteps:10});assert.equal(cpu.pc,d+7); }
 for(const effect of [0,0xff])for(const state of [0,1,2,3,4,5,255]){
  const a=m.slice(),target=d+[0x24,0x3d,0xb2,0x104,0x10a][Math.min(state,4)];
  a[0x1a90]=effect;a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:40});
  assert.equal(cpu.pc,target);assert.equal(a[d+24]|a[d+25]<<8,target);
 }
 for(const [counter,direction,pos] of [[0,0,50],[1,0,250],[1,128,250],[0x81,128,50]]){
  const a=m.slice();a[0x1ac3]=counter;a[0x1ae5]=direction;a[0x19e6]=pos;a[0x19c4]=123;a[0x4b0e]=0x85;a[0x4b0f]=0x10;a[0x4b10]=0x60;
  const after=(counter-1)&255,cpu=new CPU(a),target=after&128?0x5db9:d+0x121;cpu.x=1;cpu.pc=d+0x10a;cpu.run({until:target,maxSteps:40});
  assert.equal(cpu.pc,target);assert.equal(a[0x1ac3],after);assert.equal(a[0x19c4],after&128?123:(pos+(direction&128?4:10))&255);assert.equal(a[0x10],after&128?64:0);
 }
 for(const [hit,value,nextcarry] of [[0,1,0],[1,1,0],[1,0,0],[1,128,0],[1,0,1]]){
  const a=m.slice();a[0x1a6e]=value;a[0x1ac3]=33;a[0x1a90]=34;a[0x1ab2]=0;a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x732a);a.set([nextcarry?0x38:0x18,0x60],0x7227);a[0x5d7a]=0x60;
  a.set([0x20,(d+0x24)&255,(d+0x24)>>8,0xea],0x02f0);const cpu=new CPU(a),target=hit&&value>0&&value<128?0x02f3:d+0x27;cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:60});
  const changed=hit&&(value===0||(value&128));assert.equal(cpu.pc,target);assert.equal(a[0x1ac3],changed?10:33);assert.equal(a[0x1a90],changed?255:34);assert.equal(a[0x1ab2],changed?4:0);
 }
 for(const timer of [0,7,8,255]){
  const a=m.slice();a[0x1b29]=timer;a[0x1ab2]=2;a[d+0x12a]=0x60;a[d+0xd1]=0x60;a.set([0x85,0x10,0x60],0x4368);const cpu=new CPU(a),target=d+(timer===8?0xd0:0xc5);cpu.x=1;cpu.pc=d+0xb2;cpu.run({until:target,maxSteps:40});
  assert.equal(cpu.pc,target);assert.equal(a[0x1b29],timer===8?0:(timer+1)&255);assert.equal(a[0x1ab2],timer===8?0:2);assert.equal(a[0x10],timer===8?0:timer);
 }
 for(const [face,pos,phase,timer] of [[0,250,2,2],[1,250,2,3],[1,5,255,255],[0,20,1,3]]){
  const a=m.slice();a[0x19e6]=pos;a[0x1b18]=phase;a[0x1b07]=timer;a.set([face?0x38:0x18,0x60],0x72fc);const tick=(timer+1)&255,cpu=new CPU(a),target=d+(tick===4?0x103:0xf5);cpu.x=1;cpu.pc=d+0xd1;cpu.run({until:target,maxSteps:40});
  let v=(face?249:0)+6,c=v>>8;v=(v&255)+pos+c;c=v>>8;v=(v&255)+phase+c;assert.equal(cpu.pc,target);assert.equal(a[0x1ae5],face?249:0);assert.equal(a[0x19c4],v&255);assert.equal(a[0x1b07],tick===4?0:tick);assert.equal(a[0x1b18],tick===4?phase^2:phase);
 }
 for(const [timer,flag,success] of [[2,0,0],[0,1,0],[0,0,0],[0,0,1]]){
  const a=m.slice();a[0x1b29]=timer;a[0x1ac3]=flag;a[0x1ab2]=1;a[d+0x12a]=0x60;a[d+0xd1]=0x60;a.set([0xe6,0x10,0x60],0x4342);a.set([0xe6,0x11,success?0x38:0x18,0x60],0x190b);a.set([0xa2,2,0x60],0x447a);
  const fields=[0x194c,0x193b,0x1990,0x197f,0x1ae4];fields.forEach((addr,i)=>a[addr+1]=30+i);const cpu=new CPU(a),target=d+(timer?0x4e:0x3c);cpu.x=1;cpu.pc=d+0x3d;cpu.run({until:target,maxSteps:100});
  assert.equal(cpu.pc,target);assert.deepEqual([a[0x10],a[0x11]],timer?[1,0]:flag?[0,0]:[0,1]);assert.equal(a[0x1ab2],timer?1:2);assert.equal(a[0x1b29],timer?timer-1:0);
  if(success){fields.forEach((addr,i)=>assert.equal(a[addr+2],30+i));for(const [addr,val] of [[0x1919,35],[0x19f6,7],[0x1aa0,0],[0x19c3,173],[0x19e5,173],[0x1a07,0],[0x1ac2,4],[0x1af5,10],[0x1b06,2],[0x1ad3,1]])assert.equal(a[addr+2],val);}
 }
 for(const [timer,state] of [[0,0],[18,0],[19,0],[255,0],[7,3]]){
  const a=m.slice();a[0x1b29]=timer;a[0x1ab2]=state;a[d+0x12a]=0x60;a[d+0xd1]=0x60;
  const cpu=new CPU(a);cpu.x=1;cpu.pc=d+(state===0?0x24:0x104);const end=d+(state===0?0x3c:0x109);cpu.run({until:end,maxSteps:40});
  const next=(timer+1)&255;assert.equal(a[0x1b29],state===0?(next===20?7:next):timer);assert.equal(a[0x1ab2],state===0&&timer===19?1:0);
 }
}
console.log('OK - type-$0F dispatcher and five state paths in loads 10, 28 and 29');
