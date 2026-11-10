'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,delta] of [[0x0de9,3],[0x0d0a,-3]])for(const support of [0,128,1]){
 const a=base.slice();a[0x4db8]=support;a[0x4db9]=2;a[0x1a2b]=7;a[0x1a3c]=11;a[0x4db4]=3;const values=Array.from({length:28},(_,i)=>i);values[5]=255;values[9]=254;a.set(values,0x27);a.set([0x20,pc&255,pc>>8,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:500});assert.equal(cpu.pc,0x2f3);const expected=values.map((v,i)=>v===255||(support===1&&(i===3||i===7))?v:(v+delta)&255);assert.deepStrictEqual([...a.slice(0x27,0x43)],expected);
}
console.log('OK - resident vertical slot adjustment');
