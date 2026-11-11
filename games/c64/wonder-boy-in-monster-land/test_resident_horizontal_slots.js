'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,delta] of [[0x1107,3],[0x0f63,-3]])for(const support of [0,1,128]){
 const a=base.slice();a[0x4db8]=support;a[0x4db9]=2;a[0x1a2b]=7;a[0x1a3c]=11;a[0x4db1]=3;const lows=Array.from({length:28},(_,i)=>i),highs=Array(28).fill(10);highs[0]=0;lows[5]=255;lows[9]=254;highs[9]=255;a.set(lows,0x4c73);a.set(highs,0x4c53);a.set([0x20,pc&255,pc>>8,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:800});assert.equal(cpu.pc,0x2f3);
 const expected=lows.map((lo,i)=>(highs[i]*256+lo+(support===128&&(i===3||i===7)?0:delta))&65535);
 if(pc===0x0f63&&support!==128)expected[0]=(expected[0]&0xff00)|((expected[0]-8)&255);
 const actual=lows.map((_,i)=>a[0x4c53+i]*256+a[0x4c73+i]);assert.deepStrictEqual(actual,expected);
}
console.log('OK - resident horizontal slot adjustment');
