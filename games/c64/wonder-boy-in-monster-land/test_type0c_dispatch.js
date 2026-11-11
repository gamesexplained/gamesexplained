'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const entries=[[8,0x9701],[10,0x9f02],[26,0xab6e],[29,0xa2e6]],offsets=[0x1a,0x3e,0x57,0x75];
for(const [load,start] of entries){
 const m=base.slice(),dir=path.join(parts,`stage-${String(load).padStart(2,'0')}`);for(const r of JSON.parse(fs.readFileSync(path.join(dir,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7edf+12]|m[0x7f0f+12]<<8,start,`load ${load} type 12 target`);
 for(let state=0;state<4;state++){
  const expected=start+offsets[state],run=m.slice();run[0x1ab2]=state;const cpu=new CPU(run);cpu.pc=start;cpu.x=1;cpu.run({until:expected,maxSteps:30});
  assert.equal(run[start+16]|run[start+17]<<8,expected,`load ${load} state ${state}`);
  assert.equal(m[start+18+state]|m[start+22+state]<<8,expected,`load ${load} table ${state}`);
 }
}
console.log('OK - four loaded type-12 dispatchers and their four captured targets');
