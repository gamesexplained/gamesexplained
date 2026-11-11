'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const kind of ['inactive','right','left','countdown','finish']){
 const a=base.slice();a[0x1a90]=kind==='inactive'?0:1;a[0x1ab2]=7;a[0x1b29]=kind==='left'?8:0;a[0x1ac3]=0;a[0x19e6]=0x40;a[0x1b18]=kind==='finish'?1:2;a.fill(0,0x400,0x404);a.set([0xee,0,4,0x60],0x45bc);a.set([0xee,1,4,0x60],0x4574);a.set([0x8d,2,4,0x60],0x4b0e);a.set([0x8d,3,4,0x60],0x5db9);const entry=['countdown','finish'].includes(kind)?0xb224:0xb1ed;a.set([0xa2,1,0x20,entry&255,entry>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:100});assert.equal(cpu.pc,0x2f5);if(kind==='inactive')assert.equal(a[0x1ab2],0);else if(kind==='finish')assert.deepStrictEqual([...a.slice(0x402,0x404)],[0x20,1]);else{assert.deepStrictEqual([...a.slice(0x400,0x404)],kind==='left'?[1,0,0,0]:kind==='right'?[0,1,0,0]:[0,0,0,0]);assert.deepStrictEqual([a[0x1ad4],a[0x1ac3],a[0x19c4]],[2,2,kind==='left'?0x4e:0x46]);}
}
console.log('OK - first-load entity reaction states');
