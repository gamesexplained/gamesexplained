'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xbbd7],[4,0xb25f],[6,0xb26e],[15,0xa7f5],[17,0x9dec]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [carry,sign,carry2,direction] of [[1,1,0,0],[1,0,0,128],[1,128,0,0],[0,0,0,128],[0,0,1,0]]){
  const run=m.slice(),start=d+0x242;run.set([0x20,0x00,0x03],0x2f0);run.set([0x20,start&255,start>>8,0xe6,0x13,0x60],0x300);run[0x1b18]=direction;run[0x1a6e]=sign;run[0x1ab2]=2;run[0x1ad4]=9;run[0x19e6]=250;run[0x10]=run[0x11]=run[0x13]=0;run.set([0xe6,0x10,0x60],0x792c);run.set([carry?0x38:0x18,0x60],0x732a);run.set([carry2?0x38:0x18,0x60],0x7227);run.set([0x85,0x11,0x60],0x5d7a);
  const cpu=new CPU(run);cpu.pc=0x2f0;cpu.x=1;cpu.run({until:0x2f3,maxSteps:150});assert.equal(run[0x10],1);assert.equal(run[d+0x288],direction);assert.equal(run[0x13],carry?0:1,`load ${load} caller continuation`);
  if(carry){const positive=!!sign&&!(sign&128);assert.equal(run[0x1ab2],positive?4:5);assert.equal(run[0x1ac3],10);if(positive){assert.equal(run[0x1ae5],2);assert.equal(run[0x19c4],((4+(direction?6:0))+250)&255)}else assert.equal(run[0x1ad4],0)}else{assert.equal(run[0x1ab2],2);assert.equal(run[0x11],carry2?4:0)}
 }
}
console.log('OK - type-5 event helper returns through or past its caller in five loads with callbacks stubbed');
