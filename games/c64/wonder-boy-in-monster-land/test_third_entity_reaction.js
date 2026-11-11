'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const kind of ['inactive','right','left','zero_fallthrough','exit']){
 const a=base.slice();a[0x1a90]=kind==='inactive'?0:1;a[0x1ab2]=7;a[0x1ac3]=['left','zero_fallthrough'].includes(kind)?128:0;a[0x1ad4]=5;a[0x19e6]=kind==='zero_fallthrough'?0xf0:0x40;a.fill(0,0x400,0x404);a.set([0xee,0,4,0x60],0x45bc);a.set([0xee,1,4,0x60],0x4574);a.set([0x8d,2,4,0x60],0x4b20);a.set([0x8d,3,4,0x60],0x5db9);const entry=kind==='exit'?0xb4c8:0xb48e;a.set([0xa2,1,0x20,entry&255,entry>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:100});assert.equal(cpu.pc,0x2f5);if(kind==='inactive')assert.equal(a[0x1ab2],0);else if(kind==='exit')assert.deepStrictEqual([...a.slice(0x402,0x404)],[2,2]);else assert.deepStrictEqual([0x400,0x401,0x1ad4,0x19c4,0x19d5].map(address=>a[address]),{right:[0,1,0,0x46,0x48],left:[1,0,0,0x50,0x52],zero_fallthrough:[1,1,0,0xf6,0xf8]}[kind]);
}
console.log('OK - first-load third entity reaction');
