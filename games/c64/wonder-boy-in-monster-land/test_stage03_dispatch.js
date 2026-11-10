'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const [typ,base,targets] of [[7,0x9b96,[0x9bb6,0x9c80,0x9c9a,0x9ce0,0x9d01,0x9db6,0x9de1]],[0x24,0x9e28,[0x9e42,0x9e72,0x9e93,0x9eb1]]]){
 assert.equal(m[0x7edf+typ]|m[0x7f0f+typ]<<8,base);
 for(const [state,target] of targets.entries()){
  const a=m.slice();a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=base;cpu.run({until:target,maxSteps:20});assert.equal(cpu.pc,target);assert.equal(a[base+16]|a[base+17]<<8,target);
 }
}
console.log('OK - load 3 entity state dispatches reach eleven captured targets');
