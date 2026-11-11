'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const entries=[[8,0x97e0],[9,0xb97f],[27,0xadba]],offsets=[0x1d,0x27,0xa8,0x10a,0x12d];
for(const [load,start] of entries){
 const m=base.slice(),dir=path.join(parts,`stage-${String(load).padStart(2,'0')}`);for(const r of JSON.parse(fs.readFileSync(path.join(dir,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7edf+13]|m[0x7f0f+13]<<8,start,`load ${load} type 13 target`);
 for(let state=0;state<5;state++){
  const expected=start+offsets[state],run=m.slice();run[0x1ab2]=state;const cpu=new CPU(run);cpu.pc=start;cpu.x=1;cpu.run({until:expected,maxSteps:30});
  assert.equal(run[start+16]|run[start+17]<<8,expected,`load ${load} state ${state}`);
  assert.equal(m[start+18+state]|m[start+23+state]<<8,expected,`load ${load} table ${state}`);
 }
}
console.log('OK - three loaded type-13 dispatchers and their five captured targets');
