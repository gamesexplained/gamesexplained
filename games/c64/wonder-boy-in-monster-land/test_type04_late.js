'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xba43],[4,0xb0cb],[6,0xb0da]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [timer,direction] of [[0,0],[1,0],[1,0xfc]]){
  const run=m.slice();run[0x1a90]=timer;run[0x1ad4]=direction;run.set([0xe6,0x10,0x60],0x45bc);run.set([0xe6,0x11,0x60],0x4574);run[0x10]=run[0x11]=0;const cpu=new CPU(run);cpu.pc=d+0xde;cpu.x=1;cpu.run({until:timer?d+0x13d:d+0x16e,maxSteps:100});
  if(!timer)assert.equal(run[0x1ab2],1);else {assert.equal(run[0x10],direction?0:1);assert.equal(run[0x11],direction?1:0);}
 }
 for(const [timer,target] of [[1,d+0x13d],[0,0x5db9]]){
  const run=m.slice();run[0x1ae5]=timer;run[0x10]=0;run.set([0xe6,0x10,0x60],0x4b0e);const cpu=new CPU(run);cpu.pc=d+0xfd;cpu.x=1;cpu.run({until:target,maxSteps:100});
  assert.equal(run[0x1ae5],(timer-1)&255);if(timer)assert.equal(run[0x1ad4],4);else {assert.equal(run[0x10],1);assert.equal(cpu.a,1);}
 }
}
console.log('OK - type-4 state 2 and 3 branches in three loads with callbacks stubbed');
