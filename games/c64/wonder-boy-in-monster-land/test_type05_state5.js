'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xbbd7],[4,0xb25f],[6,0xb26e],[15,0xa7f5],[17,0x9dec]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const timer of [0,1,2,128])for(const index of [0,1,2,3,4,255])for(const sign of [0,128]){
  const run=m.slice();run[0x1ac3]=timer;run[0x1ad4]=index;run[0x1b18]=sign;run[0x19e6]=255;run[0x10]=0;run.set([0x85,0x10,0x60],0x4b0e);const neg=((timer-1)&128)!==0,target=neg?0x5db9:d+0x227;const cpu=new CPU(run);cpu.pc=d+0x208;cpu.x=1;cpu.run({until:target,maxSteps:100});assert.equal(run[0x1ac3],(timer-1)&255);
  if(neg){assert.equal(run[0x10],0x50);assert.equal(cpu.a,0x14)}else{const offset=m[(d+0x28e+index)&65535],next=(index+1)&255;assert.equal(run[d+0x288],sign);assert.equal(run[0x1ad4],next>=4?0:next);assert.equal(run[0x19c4],((offset+(sign?6:0))&255)+255&255)}
 }
}
console.log('OK - type-5 state 5 countdown, table and wrap in five loads with callback stubbed');
