'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,dispatch] of [[2,0xba43],[4,0xb0cb],[6,0xb0da]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [mode,random,column,compare,expected] of [[1,0x80,0,0,0xfc],[1,0x7f,0,0,0],[0,0,19,19,0],[0,0,19,18,0xfc]]){
  const run=m.slice(),start=dispatch+0x1e;run[0x19b3]=mode;run[0x6f3c]=compare;run.set([0xa9,random,0x60],0x3020);run.set([0xa2,column,0xa9,1,0x60],0x71db);run[dispatch+0x13d]=0x60;
  const cpu=new CPU(run);cpu.pc=start;cpu.x=1;cpu.run({until:dispatch+0x4a,maxSteps:100});
  assert.equal(run[0x1ad4],expected,`load ${load} selected value mode ${mode} random ${random} compare ${compare}`);assert.equal(run[0x1ab2],1,`load ${load} next state`);
  if(!mode)assert.equal(run[start+0x18],column,`load ${load} patched column`);
 }
}
console.log('OK - type-4 initializers select their two values in three loads with callees stubbed');
