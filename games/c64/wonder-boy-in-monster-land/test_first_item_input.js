'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const cases=[
 {held:true,layout:0,target:0xa78b}, {held:false,layout:1,target:0xa5b5},
 {held:false,input:[0,1,1],target:0xa712}, {held:false,input:[0,0,0],target:0xa712}, {held:false,input:[1,0,0],target:0xa6d4}, {held:false,input:[1,0,1],target:0xa6d4}, {held:false,input:[1,1,0],target:0xa6f2},
];
for(const c of cases){
 const m=base.slice();m[0xa84a]=c.layout||0;m[0x7b]=0;m[0xa84b]=0xff;m.set(c.input||[1,1,1],0x70);m[0x73]=(c.input||[1,1,1])[1];m[0x74]=(c.input||[1,1,1])[2];
 m[0x77e0]=0x60;m.set([0xe6,0x10,0x60],0x3c2a);m[0x370b]=0x60;m[0xa7c2]=0x60;m.set([c.held?0x38:0x18,0x60],0xa7af);m[0x3c4c]=0x60;
 const cpu=new CPU(m);cpu.pc=0xa67e;cpu.run({until:c.target,maxSteps:12000});assert.equal(cpu.pc,c.target);assert.equal(m[0xa84b],0);
 if(c.input){assert.equal(m[0x10],2);assert.equal(m[0xa84f],218);}else{assert.equal(m[0x10],220);assert.equal(m[0xa84f],0);if(!c.layout){assert.equal(m[0x4753],255);assert.equal(cpu.x|cpu.y<<8,0xa88c);}}
}
console.log('OK - first-load item input priority and 220-frame timeout with callbacks stubbed');
