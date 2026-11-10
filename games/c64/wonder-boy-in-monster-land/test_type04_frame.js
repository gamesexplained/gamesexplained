'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,dispatch] of [[2,0xba43],[4,0xb0cb],[6,0xb0da]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const counter of [0,1,2,253,254,255])for(const baseFrame of [0,1,250,254,255])for(const direction of [0,4,252,255]){
  const run=m.slice(),start=dispatch+0x13d;run[0x1ac3]=counter;run[0x19e6]=baseFrame;run[0x1ad4]=direction;const cpu=new CPU(run);cpu.pc=start;cpu.x=1;cpu.run({until:start+0x14,maxSteps:30});
  let acc=((counter+1)&255)&2;let t=acc+baseFrame;acc=t&255;t=acc+4+(t>>8);acc=t&255;t=acc+direction+(t>>8);acc=t&255;
  assert.equal(run[0x1ac3],(counter+1)&255);assert.equal(run[0x19c4],acc,`load ${load}: ${counter}, ${baseFrame}, ${direction}`);
 }
}
console.log('OK - type-4 frame helper counter wrap and addition carries in three loads');
