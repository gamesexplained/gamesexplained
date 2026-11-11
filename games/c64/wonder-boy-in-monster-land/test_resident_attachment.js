'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [sy,py,delta,flags,offset,step] of [[100,80,252,0x10,83,3],[100,83,252,0,83,0],[50,35,254,0x80,31,252],[0,250,255,4,235,241]]){
 const a=base.slice();a[0x4ccf]=sy;a[0x49]=py;a[0x6942]=delta;a[0x6937]=2;a[0x192c]=flags;a[0x4db3]=7;a[0x4d55]=7;a[0x4db6]=7;a[0x4db8]=0;a.fill(0,0x300,0x302);
 a.set([0xad,0xb4,0x4d,0x8d,0,3,0xa2,7,0x60],0x0d7f);a.set([0x8d,1,3,0x60],0x4342);a.set([0x20,0xa2,0x69,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.y=0;cpu.run({until:0x2f3,maxSteps:100});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x69b2],offset);assert.deepStrictEqual([...a.slice(0x300,0x302)],[step,(-delta)&255]);assert.deepStrictEqual([...a.slice(0x4db8,0x4dba)],[flags|2,2]);assert.equal(a[0x4db6],0);assert.equal(a[0x4db3],0);assert.equal(a[0x4d55],0);
}
console.log('OK - resident rising attachment cases');
