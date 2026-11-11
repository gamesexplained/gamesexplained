'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[8,0x97e0],[9,0xb97f],[27,0xadba]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [carry,sign,c2,direction] of [[1,1,0,0],[1,0,0,128],[1,128,0,0],[0,0,0,128],[0,0,1,0]]){
  const run=m.slice(),start=d+0x149;run.set([0x20,0x00,0x03],0x2f0);run.set([0x20,start&255,start>>8,0xe6,0x13,0x60],0x300);run[0x1ae5]=direction;run[0x1a6e]=sign;run[0x1ab2]=1;run[0x19e6]=255;run[0x10]=run[0x11]=run[0x13]=0;run.set([0xe6,0x10,0x60],0x792c);run.set([carry?0x38:0x18,0x60],0x732a);run.set([c2?0x38:0x18,0x60],0x7227);run.set([0x85,0x11,0x60],0x5d7a);const cpu=new CPU(run);cpu.pc=0x2f0;cpu.x=1;cpu.run({until:0x2f3,maxSteps:150});assert.equal(run[0x10],1);assert.equal(run[0x13],carry?0:1);
  if(carry){const positive=!!sign&&!(sign&128);assert.equal(run[0x1ab2],positive?3:4);assert.equal(run[0x1ac3],positive?4:10);if(!positive){assert.equal(run[0x1a90],255);assert.equal(run[0x19c4],((255+(direction?6:0))&255)+4&255)}}else{assert.equal(run[0x1ab2],1);assert.equal(run[0x11],c2?3:0)}
 }
}
console.log('OK - type-13 event stack paths in three loads with callbacks stubbed');
