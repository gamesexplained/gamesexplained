'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const kind of ['expired','right','left','blocked','exit_wait','exit_finish']){
 const a=base.slice();a[0x1ab2]=7;a[0x1ad4]=['left','exit_finish'].includes(kind)?0x80:0;a[0x1ae5]=['expired','exit_finish'].includes(kind)?0:1;a[0x19e6]=0x40;a.fill(0,0x400,0x404);const value=kind==='blocked'?0:2;a.set([0xee,0,4,0xa9,value,0x60],0x45bc);a.set([0xee,1,4,0xa9,value,0x60],0x4574);a.set([0x8d,2,4,0x60],0x4b0e);a.set([0x8d,3,4,0x60],0x5db9);const entry=kind.startsWith('exit')?0xb34f:0xb315;a.set([0xa2,1,0x20,entry&255,entry>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:100});assert.equal(cpu.pc,0x2f5);if(['expired','blocked'].includes(kind))assert.deepStrictEqual([a[0x1ab2],a[0x1ae5],a[0x1ad4]],[0,0,128]);else if(['right','left'].includes(kind))assert.equal(a[0x19c4],kind==='left'?0x4c:0x44);else if(kind==='exit_wait'){assert.equal(a[0x19c4],0x4e);assert.equal(a[0x1ae5],0);}else{assert.equal(a[0x19c4],0x46);assert.deepStrictEqual([...a.slice(0x402,0x404)],[0x20,2]);}
}
console.log('OK - first-load second entity reaction and exit');
