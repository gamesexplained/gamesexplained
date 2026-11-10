'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,start] of [[2,0xbbd7],[4,0xb25f],[6,0xb26e],[15,0xa7f5],[17,0x9dec]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7edf+5]|m[0x7f0f+5]<<8,start,`load ${load} type 5 vector`);
 for(const [state,offset] of [0x1e,0xac,0x15a,0x1a6,0x1e5,0x208].entries()){
  const run=m.slice(),target=start+offset;run[0x1ab2]=state;const cpu=new CPU(run);cpu.pc=start;cpu.x=1;cpu.run({until:target,maxSteps:30});
  assert.equal(run[start+16]|run[start+17]<<8,target,`load ${load} state ${state}`);
  assert.equal(m[start+18+state]|m[start+24+state]<<8,target,`load ${load} table ${state}`);
 }
}
console.log('OK - five type-5 dispatchers and their six captured targets');
