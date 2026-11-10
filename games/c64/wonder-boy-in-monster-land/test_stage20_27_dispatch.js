'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,routine,typ,active,state,target] of [[20,0xbcd5,0x1b,0,0,0xbced],[20,0xbcd5,0x1b,0,1,0xbe49],[20,0xbcd5,0x1b,0,2,0xbe83],[27,0xaf5c,0x20,1,0,0xb011],[27,0xaf5c,0x20,0,0,0xaf7f],[27,0xaf5c,0x20,128,0,0xaf7f]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${n}`, 'listing.json'))).records)if(r.b)m.set(r.b,r.a);assert.equal(m[0x7edf+typ]|m[0x7f0f+typ]<<8,routine);m.set([0xe6,0x10,0x60],0xb009);m[0x10]=0;m[0x1a90]=active;m[0x1ab2]=state;const cpu=new CPU(m);cpu.x=1;cpu.pc=routine;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target);if(n===20)assert.equal(m[0xbce5]|m[0xbce6]<<8,target);else if(target===0xaf7f){assert.equal(m[0xaf7b]|m[0xaf7c]<<8,target);assert.equal(m[0x10],1);}else assert.equal(cpu.a,8);
}
console.log('OK - load 20 and 27 entity dispatch targets');
