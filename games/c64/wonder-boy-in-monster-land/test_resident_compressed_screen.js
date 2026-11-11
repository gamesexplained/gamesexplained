'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [stream,first] of [[[255,3,200],3],[[1,255,3,199],1],[[255,3,0],3]]){
 const a=base.slice();a[0x46]=0xc4;a[0x4d71]=0xc8;a[0x4d8a]=0;a.set([0,0x60],0x52);a.set([0,0x68],0x5a);a.set(stream,0x6000);a.set([11,12,13,14],0x6804);a.set([21,22,23,24],0x680c);a.set([0x20,0x11,0x70,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:30000});assert.equal(cpu.pc,0x2f3);
 for(let row=0;row<20;row++){const expected=[];for(let col=0;col<20;col++){const tile=row<2&&col===0?first:3,chars=tile===1?[11,12,13,14]:[21,22,23,24];expected.push(...(row%2===0?chars.slice(0,2):chars.slice(2,4)));}assert.deepStrictEqual([...a.slice(0xc0c8+row*40,0xc0f0+row*40)],expected);}
 assert.equal(a[0x7062],0);
}
for(const [stream,first] of [[[255,3,200],3],[[1,255,3,199],1]]){
 const a=base.slice();a[0x46]=0xc4;a[0x4d71]=0xc8;a[0x4d8a]=0;a.set([0,0x60],0x52);a.set([0,0x68],0x5a);a.set([0,0x69],0x6c);a.set(stream,0x6000);a.set([11,12,13,14],0x6804);a.set([21,22,23,24],0x680c);for(let i=0;i<256;i++)a[0x6900+i]=i&15;a.set([0xa2,2,0x20,8,0x70,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:50000});assert.equal(cpu.pc,0x2f5);const expected=[];for(let row=0;row<20;row++)for(let col=0;col<20;col++){const tile=row<2&&col===0?first:3,chars=tile===1?[11,12,13,14]:[21,22,23,24];expected.push(...(row%2===0?chars.slice(0,2):chars.slice(2,4)));}assert.deepStrictEqual([...a.slice(0xc0c8,0xc0c8+800)],expected);assert.deepStrictEqual([...a.slice(0xd8c8,0xd8c8+800)],expected.map(x=>x&15));assert.equal(cpu.x,2);
}
console.log('OK - resident compressed screen expansion');
