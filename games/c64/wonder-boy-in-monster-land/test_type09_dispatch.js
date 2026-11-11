'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const entries=[[5,0x9424],[7,0x9a7f],[13,0x9541],[21,0x952e],[22,0xa094],[24,0x9bfb]],offsets=[0x1a,0x53,0x14b,0x16f];
for(const [load,start] of entries){
 const m=base.slice(),dir=path.join(parts,`stage-${String(load).padStart(2,'0')}`);for(const r of JSON.parse(fs.readFileSync(path.join(dir,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7edf+9]|m[0x7f0f+9]<<8,start,`load ${load} type 9 target`);
 if(load===22||load===24)assert.equal(m[0x7edf+28]|m[0x7f0f+28]<<8,start,`load ${load} type 28 target`);
 for(let state=0;state<4;state++){
  const expected=start+offsets[state],run=m.slice();run[0x1ab2]=state;const cpu=new CPU(run);cpu.pc=start;cpu.x=1;cpu.run({until:expected,maxSteps:30});
  assert.equal(run[start+16]|run[start+17]<<8,expected,`load ${load} state ${state}`);
  assert.equal(m[start+18+state]|m[start+22+state]<<8,expected,`load ${load} table ${state}`);
 }
}
console.log('OK - six loaded type-9 dispatchers and their four captured targets');
