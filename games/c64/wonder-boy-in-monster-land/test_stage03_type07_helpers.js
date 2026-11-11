'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const value of [0,1,79,80,255]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x4342);m[0x10]=0;m[0x19a2]=value;m.set([0x20,0x18,0x9d,0xea],0x02f0);const cpu=new CPU(m);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:30});assert.equal(cpu.pc,0x02f3);assert.equal(m[0x10],value===0||value>=80?1:0);assert.equal(cpu.y,value);
}
for(const mode of [0,1]){
 const m=base.slice();m[0x7a]=mode;m[0x1a2a]=3;m[0x4cd2]=0x45;m[0x1991]=0x67;m[0x7d]=0;m.set([0x20,0x25,0x9d,0xea],0x02f0);const cpu=new CPU(m);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:30});assert.equal(cpu.pc,0x02f3);assert.equal(m[0x7d],mode?0x67:0x45);assert.equal(cpu.a,m[0x7d]);
}
console.log('OK - load 3 type-$07 bounds and position selector helpers');
