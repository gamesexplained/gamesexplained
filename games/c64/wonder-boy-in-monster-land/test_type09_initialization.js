'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const entries=[[5,0x9424],[7,0x9a7f],[13,0x9541],[21,0x952e],[22,0xa094],[24,0x9bfb]];
for(const [load,dispatch] of entries){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 const start=dispatch+0x1a,after=dispatch+0x53;
 for(const [column,row,random,direction] of [[10,20,0x03,3],[10,20,0x85,0xfd],[2,1,0x00,3]]){
  const run=m.slice();run.set([0xa2,column,0xa0,row,0xa9,1,0x60],0x71db);run.set([0xa9,random,0x60],0x3020);run[0x1ab2]=0;
  const cpu=new CPU(run);cpu.pc=start;cpu.x=1;cpu.run({until:after,maxSteps:1000});
  assert.equal(run[0x1a08],7);assert.equal(run[start+0x10],column);assert.equal(run[start+0x18],row);
  assert.equal(run[0x1ac3],(column-4)&255);assert.equal(run[0x1ad4],(row-2)&255);assert.equal(run[0x1ae5],direction);
  assert.equal(run[0x1af6],random&15);assert.equal(run[0x1ab2],1);assert.equal(cpu.x,1);
 }
}
console.log('OK - six type-9 state-zero initializers, signed choices and wrapping coordinates with callees stubbed');
