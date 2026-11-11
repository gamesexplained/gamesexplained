'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [mode,carry] of [[0,0],[0,1],[1,0],[1,1]]){
 const a=base.slice();a[0x7a]=mode;a.set([0x11,0x22,0x33],0x47);a.set([0x44,0x55,0x66,0x77],0x4a6);const fields=[0x1aa2,0x195f,0x1970,0x19a3,0x19b4,0x194e,0x193d,0x1992,0x1981];for(const address of fields)a[address]=0xcc;a[0x300]=0;a.set([0xa2,2,carry?0x38:0x18,0x60],0x190b);a.set([0xee,0,3,0x60],0x4454);a.set([0x20,0x88,9,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:100});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual(fields.map(address=>a[address]),mode?[0,0xcc,0xcc,0xcc,0xcc,0x66,0x77,0x44,0x55]:[0,0x11,0x22,0x33,1,0xcc,0xcc,0xcc,0xcc]);assert.equal(a[0x300],1);
}
console.log('OK - resident spawned entity coordinates');
