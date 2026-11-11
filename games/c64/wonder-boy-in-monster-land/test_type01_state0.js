'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xb97e],[3,0x98c5],[4,0xb006],[12,0xa253],[13,0x91da],[14,0xa038],[15,0xa492],[17,0x9a89],[19,0xb765],[20,0xba9c],[23,0xb076],[26,0xa738]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 const cases=[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,9],[1,1,1,0,0,0,0,0],[1,1,0,0,0,0,0,0],[1,1,128,0,0,0,0,0],[1,0,0,0,0,0,0,0],[1,0,0,1,1,2,255,0],[1,0,0,1,0,0,254,5]];
 for(const [enabled,c1,sign,c2,c3,timer,baseFrame,flag] of cases){
  const run=m.slice();run[0x1a2a]=enabled;run[0x1a6e]=sign;run[0x1ad4]=timer;run[0x1ae5]=4;run[0x19e6]=baseFrame;run[0x1a7f]=flag;run[0x1ab2]=0;run[0x10]=run[0x11]=0;run.set([0xe6,0x10,0x60],0x792c);run.set([c1?0x38:0x18,0x60],0x732a);run.set([c2?0x38:0x18,0x60],0x7227);run.set([c3?0x38:0x18,0x60],0x72fc);run.set([0x85,0x11,0x60],0x5d7a);
  const cpu=new CPU(run);cpu.pc=d+0x18;cpu.x=1;cpu.run({until:enabled&&c1?d+0x31:d+0x7c,maxSteps:150});assert.equal(run[0x10],enabled?1:0);
  if(enabled&&c1){const state=sign&&sign<128?1:2;assert.equal(run[0x1ab2],state);if(state===2)assert.equal(run[0x1b18],8);continue}
  assert.equal(run[0x1a7f],flag||1);if(!enabled)continue;
  assert.equal(run[0x11],c2?4:0);const phase=timer?4:6;assert.equal(run[0x1ad4],timer?(timer-1)&255:2);assert.equal(run[0x1ae5],phase);const direction=c3?0:8;assert.equal(run[0x1b29],direction);let t=direction+baseFrame;let a=t&255;t=a+phase+(t>>8);assert.equal(run[0x19c4],t&255);
 }
}
console.log('OK - type-1 state-zero choices and frame update in twelve loads with external callees stubbed');
