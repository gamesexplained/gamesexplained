'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [world,y,step,fine,top,nextY,nextStep,nextFine,calls] of [[0,80,10,0,0,75,10,0,[0,0,0]],[1,170,2,0,0,168,2,0,[0,0,0]],[1,164,4,2,0,162,2,4,[0,1,0]],[1,162,3,6,1,162,3,1,[1,1,1]],[1,162,3,6,0,160,2,7,[0,0,0]],[1,50,3,0,0,75,3,0,[0,0,0]]]){
 const a=base.slice();a[0x7a]=world;a[0x49]=y;a[0x4db4]=step;a[0x4d69]=fine;a[0x569d]=top;a.fill(0,0x300,0x303);for(const [addr,i] of [[0x2f45,0],[0x0de9,1],[0x325f,2]])a.set([0xee,i,3,0x60],addr);a.set([0x20,0x7f,0x0d,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:120});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([a[0x49],a[0x4db4],a[0x4d69]],[nextY,nextStep,nextFine]);assert.deepStrictEqual([...a.slice(0x300,0x303)],calls);
}
{
 const a=base.slice();a[0x7a]=1;a[0x49]=162;a[0x4db4]=3;a[0x4d69]=2;a[0x4db8]=0;const values=Array.from({length:28},(_,i)=>i);values[5]=255;a.set(values,0x27);a.set([0x20,0x7f,0x0d,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:500});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x4d69],5);assert.deepStrictEqual([...a.slice(0x27,0x43)],values.map(v=>v===255?v:v+3));
}
console.log('OK - resident upward player scrolling');
