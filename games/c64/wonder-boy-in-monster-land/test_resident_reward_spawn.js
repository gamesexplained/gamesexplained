'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [entry,busy,right,left,oldright,oldleft,vertical,reward] of [[0x5be1,0,0,0,0,0,0,0xff],[0x5be1,0,1,1,0,0,0,0x35],[0x5be1,0,1,0,0,0,0,0xff],[0x5be1,0,0,0,0,0,0x80,0x35],[0x5c2a,0,1,1,0,0,0,0x35],[0x5c2a,0,0,0,0,0,0,0xff],[0x5be1,1,1,1,0,0,0,0x35],[0x5c2a,1,1,1,0,0,0,0x35]]){
 const a=base.slice();a[0x1919]=busy;a[0x74]=right;a[0x73]=left;a.set([oldright,oldleft],0x5264);a[0x4db3]=vertical;a[0x1177]=1;a[0x4881]=5;a[0x400]=0;a.set([0xee,0,4,0x60],0x5d2c);a.set([0xa2,2,0xa9,0x35,0x20,entry&255,entry>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:150});assert.equal(cpu.pc,0x2f7);if(busy){assert.equal(a[0x4881],6);assert.equal(a[0x400],0);}else assert.deepStrictEqual([0x1919,0x19e5,0x19f6,0x1a07,0x1ab1,0x1af5,0x400].map(address=>a[address]),entry===0x5be1?[0xfe,0xa1,1,0,reward,0xa0,1]:[0xfd,0x99,7,0,reward,0xa0,1]);
}
console.log('OK - resident reward initialization');
