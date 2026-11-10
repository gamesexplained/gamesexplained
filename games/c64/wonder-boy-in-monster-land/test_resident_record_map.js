'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [flag,mode,expected] of [[0,0,[1,2,3,4]],[128,0,[5,6,7,8]],[128,1,[9,10,11,12]]]){
 const a=base.slice();a[0x7a]=mode;a[0x7b]=0;a.set([1,2,3,4],0x7d);a[0x4747]=5;a[0x474d]=2;a[0x4753]=flag;a[0x85d0]=0xfc;a[0x8621]=0x70;a[0x7f4a]=16;a.set([5,6,7,8,9,10,11,12],0x7f6d);a.set([0,0],0x7101);a.set([0,0],0x7111);a.set([0xa0,0x25,0x20,0xd6,0x46,0x8c,0,3,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f8,maxSteps:150});assert.equal(cpu.pc,0x2f8);assert.deepStrictEqual([...a.slice(0x7101,0x7103),...a.slice(0x7111,0x7113)],expected);assert.deepStrictEqual([...a.slice(0x54,0x56)],[1,0x71]);assert.equal(a[0x300],0x25);
}
console.log('OK - resident record map writes');
