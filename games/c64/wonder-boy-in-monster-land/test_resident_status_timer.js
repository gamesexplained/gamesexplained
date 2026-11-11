'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [count,reverse,stage,nextCount,nextReverse,nextStage,draw,cost] of [[2,0,3,1,0,3,0,0],[0,0,3,255,0,3,0,0],[1,0,5,3,0,6,1,0],[1,0,6,150,0,0,1,8],[1,1,0,150,0,0,0,0],[1,1,2,8,1,1,1,0],[1,0,0,150,0,1,1,0]]){
 const a=base.slice();a[0x4b0d]=count;a[0x4dd3]=reverse;a[0x4dd4]=stage;a.fill(0,0x300,0x302);a.set([0xee,0,3,0x60],0x4a90);a.set([0x8d,1,3,0xa2,7,0x60],0x77bc);a.set([0x20,0x43,0x4a,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:80});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([a[0x4b0d],a[0x4dd3],a[0x4dd4]],[nextCount,nextReverse,nextStage]);assert.deepStrictEqual([...a.slice(0x300,0x302)],[draw,cost]);
}
{
 const a=base.slice();a[0x4b0d]=1;a[0x4dd3]=0;a[0x4dd4]=5;a[0x51b9]=0;a[0x51c0]=0x60;a.set(Array.from({length:20},(_,i)=>i),0x6000);a.set([0x20,0x43,0x4a,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:500});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x4dd4],6);assert.equal(a[0x4b0d],3);for(let row=0;row<5;row++)assert.deepStrictEqual([...a.slice(0xc024+40*row,0xc028+40*row)],Array.from({length:4},(_,i)=>row*4+i));for(let row=0;row<3;row++)assert.deepStrictEqual([...a.slice(0xd84c+40*row,0xd850+40*row)],Array(4).fill(15));
}
console.log('OK - resident status timer stages');
