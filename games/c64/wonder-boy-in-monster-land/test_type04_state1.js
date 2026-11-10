'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xba43],[4,0xb0cb],[6,0xb0da]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [carry,a,target,state] of [[0,0,d+0x123,0],[0,1,d+0x4a,5],[0,2,d+0x4a,0],[0,3,d+0x4a,0],[1,8,d+0x123,0],[1,0,d+0x4a,4]]){
  const run=m.slice();run[d+0x152]=0x60;run.set([0xa9,a,carry?0x38:0x18,0x60],d+0x12b);run[0x1ab2]=0;run[0x1a7f]=0;run[0x1b29]=7;run[0x1b18]=7;const cpu=new CPU(run);cpu.pc=d+0x4b;cpu.x=1;cpu.run({until:target,maxSteps:100});
  assert.equal(run[0x1ab2],state,`load ${load} state carry ${carry} A ${a}`);
  if(state===4||state===5){assert.equal(run[0x1a7f],0);assert.equal(run[0x1b29],0)}else assert.equal(run[0x1a7f],1);
  assert.equal(run[0x1b18],state===5?0:7);
  if(!carry)assert.equal(run[d+0x79]|run[d+0x7a]<<8,a===0?d+0x123:a===1?d+0xa2:d+0x4a);
 }
}
console.log('OK - type-4 state-one movement outcomes in three loads with callees stubbed');
