'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
{
 const m=base.slice();m[1]=0x35;m[0x64]=0xfe;m[0x65]=0x30;m[0x7df8]=7;m[0x10]=0;m.set([0xe6,0x10,0xa5,0x10,0x60],0x7dc4);
 const cpu=new CPU(m);cpu.pc=0x7e02;cpu.run({until:0x7e24,maxSteps:100});assert.equal(cpu.pc,0x7e24);assert.deepEqual([...m.slice(0x30fe,0x3101)],[1,2,3]);assert.equal(m[0x64]|m[0x65]<<8,0x3101);assert.equal(m[1],0x35);
}
{
 const m=base.slice();m[1]=0x35;m[0x64]=0xbe;m[0x65]=0x4d;m.set([0x11,0x22,0x33],0x4dbe);m[0x11]=0;m[0x7d83]=0x60;m.set([0x85,0x10,0xe6,0x11,0x60],0x7e53);
 const cpu=new CPU(m);cpu.pc=0x7e25;cpu.run({until:0x7e43,maxSteps:100});assert.equal(cpu.pc,0x7e43);assert.equal(m[0x10],0x33);assert.equal(m[0x11],3);assert.equal(m[0x64]|m[0x65]<<8,0x4dc1);assert.equal(m[1],0x35);
}
console.log('OK - transfer memory receive and send with serial callbacks stubbed');
