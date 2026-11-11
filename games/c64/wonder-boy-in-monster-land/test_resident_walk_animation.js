'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [enabled,left,right,index,delay,frame,nextIndex,nextDelay] of [[0,0,0,3,4,0x55,0,0],[1,1,1,3,4,0x69,0,0],[1,0,1,3,4,0x55,3,3],[1,0,1,0,0,0x6b,1,1],[1,0,1,1,0,0x69,2,1],[1,0,1,2,0,0x6d,3,2],[1,0,1,3,0,0x69,4,1],[1,0,1,4,0,0x6b,0,1]]){
 const a=base.slice();a[0x4db7]=enabled;a[0x73]=left;a[0x74]=right;a[0x0c22]=index;a[0x0c23]=delay;a[0x1177]=3;a[0x4a]=0x55;a.set([0x20,0xc6,0x0b,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:100});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x4a],frame);assert.equal(a[0x0c22],nextIndex);assert.equal(a[0x0c23],nextDelay);
}
console.log('OK - resident walk animation cases');
