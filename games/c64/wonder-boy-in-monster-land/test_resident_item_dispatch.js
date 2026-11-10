'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [entry,seed,enabled,result,fallback] of [[0x49e3,6,1,1,false],[0x49e3,7,7,7,false],[0x4a12,2,4,4,false],[0x4a12,6,0,6,true]]){
 const a=base.slice();a.fill(0,0x7f5e,0x7f66);a.fill(0,0x7f64,0x7f6b);if(entry===0x49e3||fallback)a[0x7f5e+result]=1;if(entry===0x4a12)a[0x7f64+enabled]=1;a.set([0xa9,seed,0x60],0x3020);a.set(Array.from({length:8},(_,i)=>0x10+i*16),0x4a02);a.fill(3,0x4a0a,0x4a12);a.set(Array.from({length:7},(_,i)=>0x10+i*16),0x4a35);a.fill(3,0x4a3c,0x4a43);for(let i=0;i<8;i++)a.set([0xa9,i,0x8d,0,3,0x8c,1,3,0x60],0x310+i*16);a.set([0x20,entry&255,entry>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:250});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([...a.slice(0x300,0x302)],[result,result]);
}
console.log('OK - resident item selection and dispatch');
