'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-04'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
assert.equal(base[0x7ee7]|base[0x7f17]<<8,0xb4f3);
for(const [state,target] of [0xb50f,0xb530,0xb5b4,0xb5f2,0xb619].entries()){
 const m=base.slice();m[0x1ab2]=state;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xb4f3;cpu.run({until:target,maxSteps:25});assert.equal(cpu.pc,target);assert.equal(m[0xb503]|m[0xb504]<<8,target);
}
console.log('OK - load 4 type-$08 dispatcher reaches five captured targets');
