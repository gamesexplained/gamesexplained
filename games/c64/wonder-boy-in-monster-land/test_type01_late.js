'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xb97e],[3,0x98c5],[4,0xb006],[12,0xa253],[13,0x91da],[14,0xa038],[15,0xa492],[17,0x9a89],[19,0xb765],[20,0xba9c],[23,0xb076],[26,0xa738]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [timer,direction,frame,baseFrame] of [[0,0,0,0],[1,0,0,0],[1,8,0xff,0xfe],[1,255,254,255]]){
  const run=m.slice();run[0x1a90]=timer;run[0x1b29]=direction;run[0x1ac3]=frame;run[0x19e6]=baseFrame;run[0x1ab2]=1;run[0x10]=run[0x11]=0;run.set([0xe6,0x10,0x60],0x45bc);run.set([0xe6,0x11,0x60],0x4574);const cpu=new CPU(run);cpu.pc=d+0x7d;cpu.x=1;cpu.run({until:timer?d+0xb3:d+0x87,maxSteps:100});
  if(!timer){assert.equal(run[0x1ab2],0);continue}assert.equal(run[0x10],direction?1:0);assert.equal(run[0x11],direction?0:1);assert.equal(run[0x1ad4],2);let a=frame^2,t=a+4;a=t&255;t=a+direction+(t>>8);a=t&255;t=a+baseFrame+(t>>8);assert.equal(run[0x19c4],t&255);assert.equal(run[0x1ac3],frame^2);
 }
 for(const timer of [0,1,2]){
  const run=m.slice();run[0x1b18]=timer;run[0x10]=0;run.set([0xe6,0x10,0x60],0x4b0e);const cpu=new CPU(run);cpu.pc=d+0xb4;cpu.x=1;cpu.run({until:timer===1?0x5db9:d+0x9a,maxSteps:60});assert.equal(run[0x1b18],(timer-1)&255);if(timer===1){assert.equal(run[0x10],1);assert.equal(cpu.a,1)}
 }
}
console.log('OK - type-1 states 1 and 2 in twelve loads with callbacks stubbed');
