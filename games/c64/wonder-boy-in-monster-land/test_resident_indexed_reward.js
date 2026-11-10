'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const entry of [0x5c66,0x5c94]){
 const a=base.slice();a[0x447a]=0x60;a.set([0x8d,0,4,0x60],0x4342);a[0x194e]=0x4b;a[0x193d]=0;a[0x1992]=0x7a;a[0x1981]=0;a[0x400]=0;a.set([0xa2,2,0xa9,0x35,0x20,entry&255,entry>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:150});assert.equal(cpu.pc,0x2f7);const actual=[0x1ab3,0x191b,0x19e7,0x19c5,0x19f8,0x1a09,0x1af7,0x1ac4,0x400].map(address=>a[address]);assert.deepStrictEqual(actual,entry===0x5c66?[0x35,0xfe,0xa1,0xa1,1,0,0xa0,1,12]:[0x35,0xfd,0x99,0x99,7,0,0xa0,9,12]);if(entry===0x5c94)assert.equal(a[0x1ad5],2);
}
console.log('OK - resident indexed reward initialization');
