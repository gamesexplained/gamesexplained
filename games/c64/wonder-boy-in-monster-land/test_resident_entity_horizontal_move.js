'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,mode,pos,step,type,flags,next,result,carry,release] of [[0x43a2,1,0,1,0,0,0xffff,255,0,0],[0x43a2,0,0x20,1,0,0,0x1f,3,0,0],[0x43a2,0,0x1f,1,0,0,0x1f,15,1,0],[0x43a2,0,0x1f,1,0x28,0,0x1e,0x77,1,1],[0x43f0,1,0xff,1,0,0,0x100,1,0,0],[0x43f0,0,0x13f,1,0,0,0x140,15,1,0],[0x43f0,0,0x11e,1,0,1,0x11f,15,1,0],[0x43f0,0,0x13f,1,0x28,0,0x140,0x77,1,1],[0x43f0,0,0x11e,1,0x28,1,0x11f,15,1,0]]){
 const a=base.slice();a[0x7a]=mode;a[0x191b]=type;a[0x192c]=flags;const [lo,hi]=mode?[0x194e,0x193d]:[0x195f,0x1970];a[lo]=pos&255;a[hi]=pos>>8;a[0x300]=0;a.set([0xee,0,3,0x38,0xa9,0x77,0x60],0x4454);a.set([0xa2,2,0xa9,step,0x20,pc&255,pc>>8,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:100});assert.equal(cpu.pc,0x2f7);assert.deepStrictEqual([a[lo]+256*a[hi],cpu.a,cpu.c,a[0x300]],[next,result,carry,release]);
}
for(const blocked of [0,1]){
 const a=base.slice();a[0x7a]=1;a[0x194e]=64;a[0x193d]=0;a[0x1992]=128;a[0x1981]=0;for(let row=1;row<5;row++){const ptr=0x7000+row*16;a[0x85d0+row]=ptr&255;a[0x8621+row]=ptr>>8;a[ptr+2]=10+row;a[0x80cf+10+row]=blocked&&row===2?2:0;}a.set([0xa2,2,0xa0,7,0xa9,4,0x20,0xbc,0x45,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f9,maxSteps:350});assert.equal(cpu.pc,0x2f9);assert.deepStrictEqual([cpu.a,cpu.c,cpu.x,cpu.y],[blocked?4:0,blocked,2,7]);assert.equal(a[0x194e],blocked?64:60);
}
console.log('OK - resident horizontal entity movement');
