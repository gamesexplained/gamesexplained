'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[19,0xbaea],[24,0x9dcb],[28,0xa910]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7ef6]|m[0x7f26]<<8,d);
 for(const [effect,timer,active,success] of [[1,2,1,0],[0,3,1,0],[0,0,1,0],[0,0xfd,0,0],[0,0xfd,1,0],[0,0xfd,1,1]]){
  const a=m.slice();a[0x1a7f]=0;a[0x1a90]=effect;a[0x1b29]=timer;a[0x1a2a]=active;a[0x19e6]=40;a[0x4dae]=56;a[0x49]=52;a[d+0x8e]=0x60;a.set(success?[0xa2,2,0x38,0x60]:[0x18,0x60],0x190b);const fields=[0x193b,0x197f,0x194c,0x1990];fields.forEach((addr,i)=>a[addr+1]=30+i);a.set([0x20,d&255,d>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});const after=(timer-1)&255,alloc=!effect&&after===0xfc&&active;assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1a7f],1);assert.equal(a[0x1b29],effect?5:after===0xfc?20:after);assert.equal(a[0x19c4],effect?44:(40+(after&128?2:0))&255);if(alloc&&success){fields.forEach((addr,i)=>assert.equal(a[addr+2],30+i));for(const [addr,val] of [[0x1919,44],[0x19e5,46],[0x19c3,46],[0x1aa0,0],[0x1ac2,56],[0x1ad3,26]])assert.equal(a[addr+2],val);}
 }
 for(const [hit,value,follow] of [[0,1,0],[0,1,1],[1,1,0],[1,0,0],[1,128,0]]){
  const a=m.slice();a[0x1a6e]=value;a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x732a);a.set([follow?0x38:0x18,0x60],0x7227);a.set([0x85,0x10,0x60],0x5d7a);a.set([0x85,0x11,0x60],0x4b0e);a.set([0x20,(d+0x8e)&255,(d+0x8e)>>8,0xea],0x02f0);const exit=hit&&(value===0||(value&128)),target=exit?0x5db9:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.deepEqual([a[0x10],a[0x11]],[!hit&&follow?4:0,exit?64:0]);if(exit)assert.equal(cpu.a,4);
 }
}
console.log('OK - type-$17 handler and event paths in loads 19, 24 and 28');
