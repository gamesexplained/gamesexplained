'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xba43],[4,0xb0cb],[6,0xb0da]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [enabled,carry1,sign,index,carry2,state,target] of [[0,0,0,0,0,0,d+0x193],[1,1,1,0,0,2,d+0x16e],[1,1,0,0,0,3,d+0x16e],[1,1,0x80,3,0,3,d+0x16e],[1,0,0,0,0,0,d+0x193],[1,0,0,0,1,0,d+0x123]]){
  const run=m.slice();run[0x1a2a]=enabled;run[0x1a6e]=sign;run[0x1af6]=index;run[0x1b2b]=9;run[0x1ab2]=0;run[0x10]=run[0x11]=run[0x12]=0;run.set([0xe6,0x10,0x60],0x792c);run.set([carry1?0x38:0x18,0x60],0x732a);run.set([carry2?0x38:0x18,0x60],0x7227);run.set([0x85,0x11,0x60],0x5d7a);run.set([0xe6,0x12,0x60],d+0x1e);
  const cpu=new CPU(run);cpu.pc=d+0x152;cpu.x=1;cpu.run({until:target,maxSteps:100});assert.equal(run[0x10],enabled?1:0);assert.equal(run[0x1ab2],state);assert.equal(run[0x12],state===2?1:0);assert.equal(run[0x1b2b],state===3&&index===3?8:9);assert.equal(run[0x11],enabled&&!carry1&&carry2?2:0);assert.equal(cpu.x,1);if(state===3){assert.equal(run[0x1ae5],10);if(index)assert.equal(run[d+0x181],1)}
 }
}
console.log('OK - type-4 event check branches and alternate index in three loads with external callees stubbed');
