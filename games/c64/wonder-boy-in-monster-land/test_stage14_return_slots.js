'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [lo,hi] of [[0xa5a6,0xa5b0],[0xa8c1,0xa8cc]])for(let target=lo;target<=hi;target++){
 assert.equal(base[target],0x60);assert([...Array(48).keys()].some(t=>(base[0x7edf+t]|base[0x7f0f+t]<<8)===target));const m=base.slice();m.set([0x20,target&255,target>>8,0xea],0x02f0);const cpu=new CPU(m);cpu.a=0x53;cpu.x=1;cpu.y=2;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:5});assert.equal(cpu.pc,0x02f3);assert.deepEqual([cpu.a,cpu.x,cpu.y],[0x53,1,2]);
}
console.log('OK - 23 load 14 entity vector slots immediately return');
