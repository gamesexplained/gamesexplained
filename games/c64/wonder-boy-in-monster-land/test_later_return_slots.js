'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,parts=path.join(root,'parts'),base=new Uint8Array(65536),report=JSON.parse(fs.readFileSync(path.join(root,'later-return-slots.json')));let total=0;
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const group of report){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,group.part,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const {address,types} of group.entries){assert.equal(m[address],0x60);assert.deepEqual([...Array(48).keys()].filter(t=>(m[0x7edf+t]|m[0x7f0f+t]<<8)===address),types);const a=m.slice();a.set([0x20,address&255,address>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.a=0x53;cpu.x=1;cpu.y=2;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:5});assert.equal(cpu.pc,0x02f3);assert.deepEqual([cpu.a,cpu.x,cpu.y],[0x53,1,2]);total++;}
}
assert(total>=800);console.log(`OK - ${total} captured entity vector entries immediately return`);
