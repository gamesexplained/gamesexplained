'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xba43],[4,0xb0cb],[6,0xb0da]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const val of [0,1,255])for(const clear of [false,true]){
  const run=m.slice();run[0x1a7f]=val;const cpu=new CPU(run);cpu.pc=d+(clear?0x11d:0x114);cpu.x=1;cpu.run({until:d+(clear?0x122:0x11c),maxSteps:50});assert.equal(run[0x1a7f],clear?0:(val||1));
 }
 for(const direction of [0,4,0x7f,0x80,0xfc,0xff])for(const toggle of [false,true]){
  const run=m.slice();run[0x1ad4]=direction;run[d+0x13d]=0x60;const result=toggle?(direction^0xfc):direction;const target=result&0x80?0x45bc:0x4574;const cpu=new CPU(run);cpu.pc=d+(toggle?0x123:0x12b);cpu.x=1;cpu.run({until:target,maxSteps:50});assert.equal(run[0x1ad4],result);assert.equal(cpu.a,2);
 }
}
console.log('OK - type-4 flag and movement helpers in three loads with frame helper stubbed');
