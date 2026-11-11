'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(let state=0;state<256;state++){
 const m=base.slice();m[0x1ab2]=state;const cpu=new CPU(m);cpu.call(0x2a7d,{x:1},{maxSteps:30});assert.equal(cpu.y,Math.min(state,4));assert.equal(m[0x1ab2],state);
}
for(const x of [0,1,255]){
 const m=base.slice();m[0x4777]=3;m[0x4777+x]=0xa1;const cpu=new CPU(m);cpu.call(0x2a87,{x},{maxSteps:30});assert.equal(m[0x4777],0x4f);assert.equal(cpu.y,x?0xa1:0x4f);
}
for(let state=0;state<256;state++)for(const salt of [0,1,0x80,255]){
 const m=base.slice();m[0x526d]=state;m[0x4b0d]=salt;const cpu=new CPU(m);cpu.call(0x3020,{d:0},{maxSteps:30});const expected=((5*state+1)&255)^salt;assert.equal(cpu.a,expected);assert.equal(m[0x526d],expected);
}
{
 const m=base.slice();m.set([0x12,0x34,0x56],0x4dbe);m[0x7a9a]=0x60;const cpu=new CPU(m);cpu.call(0x2b75,{}, {maxSteps:50});assert.deepEqual([...m.slice(0x2b72,0x2b75)],[0x12,0x34,0x56]);assert.equal(m[0x7ae3],0x2c);
}
for(let counter=0;counter<256;counter++){
 const m=base.slice();m[0x7be2]=counter;m[0x10]=0;m.set([0xe6,0x10,0x60],0x2201);const cpu=new CPU(m);cpu.call(0x7be1,{}, {maxSteps:200});assert.equal(m[0x7be2],counter?counter-1:6);assert.equal(m[0x10],counter?1:0);if(!counter)assert.equal(cpu.x,255);
}
console.log('OK - clamp, stage field, generator, record copy and sound service boundary cases');
