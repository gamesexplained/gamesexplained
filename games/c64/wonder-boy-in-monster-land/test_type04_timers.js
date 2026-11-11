'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xba43],[4,0xb0cb],[6,0xb0da]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(let index=0;index<=6;index++){
  const run=m.slice();run[d+0x152]=0x60;run.set([0x85,0x10,0x60],0x4342);run[0x1b29]=index;run[0x1ab2]=4;run[0x10]=0xff;const cpu=new CPU(run);cpu.pc=d+0x83;cpu.x=1;cpu.run({until:index===6?d+0x4a:d+0x12d,maxSteps:100});
  assert.equal(run[0x1b29],index===6?6:index+1);assert.equal(run[0x1ab2],index===6?1:4);if(index<6){assert.equal(run[0x10],6-index);assert.equal(cpu.a,1)}
 }
 for(const old of [0,5,6,9,10,11,254,255]){
  const run=m.slice();run[d+0x152]=0x60;run.set([0x85,0x10,0x60],0x4368);run[0x1b29]=old;run[0x1b18]=12;run[0x1a7f]=7;run[0x1ab2]=5;run[0x10]=0xff;const next=(old+1)&255,target=next<7?d+0x12b:next===11?d+0x4a:d+0x12d;const cpu=new CPU(run);cpu.pc=d+0xb1;cpu.x=1;cpu.run({until:target,maxSteps:100});
  assert.equal(run[0x1b29],next);assert.equal(run[0x1a7f],0);assert.equal(run[0x1ab2],next===11?1:5);assert.equal(run[0x1b18],next>=7&&next!==11?13:12);assert.equal(run[0x10],next<7?0xff:next===11?6:13);
 }
}
console.log('OK - type-4 state 4 and 5 counters, boundaries and wrap in three loads with callees stubbed');
