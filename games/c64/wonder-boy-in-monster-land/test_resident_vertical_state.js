'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const cases=[[1,1,1,2,0,0,0,0x72,[2],1],[1,1,0,12,0,0,0,0x70,[8],11],[1,1,0x80,0,0,0,0,0x70,[],0],[1,0,1,1,0,0,0,0x55,[1],0],[0,1,0,0,0,1,2,0x70,[3,8],7],[0,1,0,0,1,1,2,0x55,[],0],[0,1,0,0,0,0,2,0x55,[],0],[0,1,0,0,0,1,3,0x55,[],0]];
for(const [state,enabled,anim,count,oldUp,newUp,fall,frame,steps,newCount] of cases){
 const a=base.slice();a[0x4db3]=state;a[0x4db7]=enabled;a[0x4d55]=anim;a[0x1178]=count;a[0x1177]=0;a[0x4a]=0x55;a[0x71]=oldUp;a[0x76]=newUp;a[0x4db5]=fall;a[0x4dbd]=0;a[0x4dd5]=3;a.fill(0,0x300,0x304);
 a.set([0xee,0,3,0xae,0,3,0xad,0xb4,0x4d,0x9d,0,3,0x60],0x0d7f);a[0x0bc6]=0x60;a.set([0x20,0x41,0x0b,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:300});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x300],steps.length);assert.deepStrictEqual([...a.slice(0x301,0x301+steps.length)],steps);assert.equal(a[0x4a],frame);assert.equal(a[0x1178],newCount);
}
console.log('OK - resident vertical state and input cases');
