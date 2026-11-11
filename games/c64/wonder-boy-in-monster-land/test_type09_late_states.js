'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const entries=[[5,0x9424],[7,0x9a7f],[13,0x9541],[21,0x952e],[22,0xa094],[24,0x9bfb]];
for(const [load,dispatch] of entries){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 const state1=dispatch+0x53,state2=dispatch+0x14b,state3=dispatch+0x16f,shared=dispatch+0x190;
 // State 2 with no effect clears its phase, selects state 1 and jumps there.
 {const s=m.slice();s[0x1a90]=0;s[0x1af6]=9;s[0x1ab2]=2;const cpu=new CPU(s);cpu.pc=state2;cpu.x=1;cpu.run({until:state1,maxSteps:100});assert.equal(s[0x1af6],0);assert.equal(s[0x1ab2],1);}
 // With an effect, its direction selects one of two movement callbacks.
 for(const sign of [0,0x80]){const s=m.slice();s[0x1a90]=1;s[0x1b07]=sign;s.set([0x18,0x60],shared);s.set([0x8d,0xe0,2,0x60],0x4574);s.set([0x8d,0xe1,2,0x60],0x45bc);s[0x2e0]=s[0x2e1]=0;new CPU(s).call(state2,{x:1},{maxSteps:1000});assert.equal(s[0x2e0],sign?10:0);assert.equal(s[0x2e1],sign?0:10);}
 // State 3 returns on clear; on set it selects a reward callback from the entity type.
 for(const [carry,type] of [[0,0],[1,0],[1,0x1c]]){
  const s=m.slice();s.set([carry?0x38:0x18,0x60],shared);s[0x191a]=type;s.set([0x8d,0xe0,2,0x60],0x4b0e);s.set([0x8d,0xe1,2,0x60],0x4b20);s.set([0x8d,0xe2,2,0x60],0x5db9);s[0x2e0]=s[0x2e1]=s[0x2e2]=0;const cpu=new CPU(s);cpu.call(state3,{x:1},{maxSteps:1000});
  assert.equal(s[0x2e0],carry&&type!==0x1c?0x50:0);assert.equal(s[0x2e1],carry&&type===0x1c?0x30:0);assert.equal(s[0x2e2],carry?2:0);if(!carry)assert.equal(cpu.c,0);
 }
}
console.log('OK - six type-9 late-state paths with the shared and external callbacks stubbed');
