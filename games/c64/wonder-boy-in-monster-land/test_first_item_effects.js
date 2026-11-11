'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,mask,counter,value] of [[0xac61,8,0x4de0,255],[0xac67,0x80,0x4dde,5],[0xac6d,0x20,0x4ddf,10],[0xac73,0x10,0,0]]){
 const m=base.slice();m[0x4dbd]=0;m[0x4de2]=1;const cpu=new CPU(m);cpu.pc=pc;cpu.run({until:0xa7d2,maxSteps:50});assert.equal(cpu.pc,0xa7d2);assert.equal(m[0x4de2],1|mask);if(counter)assert.equal(m[counter],value);
}
for(const [pc,input,address,value] of [[0xac79,21,0x4dd5,21],[0xac82,4,0x4dd9,254],[0xac8e,10,0x4dd7,253]]){
 const m=base.slice();m[0x4dbd]=0;m[0x7b]=0;m[0x477d]=0xe0;m[0x4783]=2;m[0x10]=0;m.set([0xe6,0x10,0x60],0x2e0);const cpu=new CPU(m);cpu.pc=pc;cpu.a=input;cpu.p&=~8;cpu.run({until:0xa7d2,maxSteps:80});assert.equal(cpu.pc,0xa7d2);assert.equal(m[address],value);if(pc===0xac8e)assert.equal(m[0x10],1);
}
console.log('OK - first-load item effects with slot disable and record callback stopped or stubbed');
