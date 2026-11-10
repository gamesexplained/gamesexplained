'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xbbd7],[4,0xb25f],[6,0xb26e],[15,0xa7f5],[17,0x9dec]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 assert.deepEqual([...m.slice(d+0x28a,d+0x292)],[2,2,0,0,4,4,2,2]);
 for(let input=0;input<256;input++)for(const working of [0,0x80])for(const baseFrame of [0,1,6,127,250,255]){
  const run=m.slice();run[d+0x288]=working;run[0x19e6]=baseFrame;const cpu=new CPU(run);cpu.pc=d+0x232;cpu.x=1;cpu.a=input;cpu.run({until:d+0x241,maxSteps:30});assert.equal(run[0x19c4],((input+(working?6:0))&255)+baseFrame&255,`load ${load}, A ${input}, working ${working}, base ${baseFrame}`);
 }
}
console.log('OK - type-5 frame helper and offset tables in five loads with decimal mode clear');
