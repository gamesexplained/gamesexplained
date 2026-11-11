'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const flag of [0,0x10]){
 const a=base.slice();a[0x4dbd]=1;a[0x4de3]=flag;a[0x7f69]=0x66;a.fill(0,0x300,0x308);a[0x447a]=0x60;a.set([0x8d,0,3,0xa2,9,0xa0,8,0x60],0x77e2);a.set([0x8d,1,3,0x8e,2,3,0x8c,3,3,0x60],0x4342);a.set([0x8e,4,3,0x8c,5,3,0xee,6,3,0x60],0x49e3);a.set([0xa2,2,0xa0,3,0x20,0x7d,0x49,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:150});assert.equal(cpu.pc,0x2f7);if(flag)assert.deepStrictEqual([...a.slice(0x304,0x307)],[2,3,1]);else{assert.deepStrictEqual([...a.slice(0x300,0x304)],[0x11,12,2,3]);assert.deepStrictEqual([0x19e7,0x19f8,0x191b,0x1af7,0x19c5].map(address=>a[address]),[0x66,1,0xf0,0xa0,0x66]);}
}
console.log('OK - resident revival item selection');
