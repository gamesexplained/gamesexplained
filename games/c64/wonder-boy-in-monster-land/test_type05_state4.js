'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xbbd7],[4,0xb25f],[6,0xb26e],[15,0xa7f5],[17,0x9dec]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const timer of [0,1,2,128])for(const carry of [0,1])for(const result of [0,2,3,6]){
  const run=m.slice();run[0x1ac3]=timer;run[0x1ae5]=5;run[0x1ab2]=4;run[0x10]=run[0x11]=run[0x12]=0;run.set([carry?0x38:0x18,0x60],0x72fc);run.set([0x85,0x12,0xe6,0x10,0xa9,result,0x60],0x4574);run.set([0x85,0x12,0xe6,0x11,0xa9,result,0x60],0x45bc);const negative=((timer-1)&128)!==0,target=!negative&&(result&6)===2?d+0x200:d+0x207;const cpu=new CPU(run);cpu.pc=d+0x1e5;cpu.x=1;cpu.run({until:target,maxSteps:100});
  assert.equal(run[0x1ac3],(timer-1)&255);assert.equal(run[0x1ab2],negative||(result&6)!==2?5:4);assert.equal(run[0x10],!negative&&carry?1:0);assert.equal(run[0x11],!negative&&!carry?1:0);assert.equal(run[0x12],negative?0:8);
 }
}
console.log('OK - type-5 state 4 timer and callback outcomes in five loads with callbacks stubbed');
