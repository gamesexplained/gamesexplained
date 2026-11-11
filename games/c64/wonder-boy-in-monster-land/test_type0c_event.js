'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[8,0x9701],[10,0x9f02],[26,0xab6e],[29,0xa2e6]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const value of [0,1,2,0x80,0x84,0x85,0xff])for(const sign of [0,128]){
  const run=m.slice();run[0x1ac3]=value;run[d+0xde]=sign;run[0x10]=run[0x11]=run[0x12]=255;run.set([0x85,0x10,0x60],0x4342);run.set([0x85,0x11,0x60],0x4368);run.set([0x85,0x12,0x60],0x4b0e);const terminal=value>=0x85,target=terminal?0x5db9:sign?0x43f0:0x43a2;const cpu=new CPU(run);cpu.pc=d+0x75;cpu.x=1;cpu.run({until:target,maxSteps:100});
  if(terminal){assert.equal(run[0x12],0x20);assert.equal(cpu.a,3);assert.equal(run[0x1ac3],value)}else{assert.equal(cpu.a,3);assert.equal(run[0x1ac3],value===0?0x81:value<128?value-1:value+1);if(value>0&&value<128)assert.equal(run[0x10],value);else assert.equal(run[0x11],value&127)}
 }
 for(const [carry,c2,rotate] of [[0,0,0],[0,1,1],[1,0,0],[1,0,1]]){
  const run=m.slice(),start=d+0xaf;run.set([0x20,0x00,0x03],0x2f0);run.set([0x20,start&255,start>>8,0xe6,0x13,0x60],0x300);run[d+0xde]=0x55;run[0x19e6]=255;run[0x1ab2]=1;run[0x10]=run[0x11]=run[0x13]=0;run.set([0xe6,0x10,0x60],0x792c);run.set([carry?0x38:0x18,0x60],0x732a);run.set([c2?0x38:0x18,0x60],0x7227);run.set([rotate?0x38:0x18,0x60],0x72fc);run.set([0x85,0x11,0x60],0x5d7a);const cpu=new CPU(run);cpu.pc=0x2f0;cpu.x=1;cpu.run({until:0x2f3,maxSteps:100});assert.equal(run[0x10],1);assert.equal(run[0x13],carry?0:1);if(carry){assert.equal(run[d+0xde],0x2a|(rotate?128:0));assert.equal(run[0x19c4],1);assert.equal(run[0x1ac3],5);assert.equal(run[0x1ab2],3)}else{assert.equal(run[0x11],c2?8:0);assert.equal(run[0x1ab2],1)}
 }
}
console.log('OK - type-12 state 3 and event stack paths in four loads with callbacks stubbed');
