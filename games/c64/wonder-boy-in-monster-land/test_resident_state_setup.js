'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const operand of [0,0xa5]){
 const a=base.slice();a.set([0xee,2,4,0x60],0x6b50);a[0x21f0]=operand;a.fill(0,0x400,0x403);a.set([0x20,0xfc,0x29,0x8d,0,4,0x20,0x16,0x2a,0x8e,1,4,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2fc,maxSteps:100});assert.equal(cpu.pc,0x2fc);assert.deepStrictEqual([...a.slice(0x400,0x403)],[operand,3,1]);assert.deepStrictEqual([...a.slice(0x51c4,0x51c8)],[0,1,2,3]);assert.deepStrictEqual([...a.slice(0x51e4,0x51e8)],[3,3,3,3]);
}
console.log('OK - resident state reads and tables');
