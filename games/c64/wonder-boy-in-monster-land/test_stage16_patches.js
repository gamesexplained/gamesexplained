'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const mem=new Uint8Array(65536);for(const part of ['resident','stage-16'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)mem.set(r.b,r.a);
const targets=[0x8f13,0x8f4b,0x8f7c,0x8faa,0x9023,0x904e,0x907e];
for(let state=0;state<targets.length;state++){
 const m=mem.slice();m[0x792c]=0x60;m[0x1ab2]=state;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x8ef0;let steps=0;
 while(cpu.pc!==targets[state]){assert(steps++<20,`state ${state}: dispatch`);cpu.step();}
 assert.equal(m[0x8f03]|m[0x8f04]<<8,targets[state]);
}
for(const returnedX of [0,1,6,16,255])for(const column of [0,5,6,15,16,254,255]){
 const m=mem.slice();m.set([0xa2,returnedX,0xa9,1,0x60],0x71db);m[0x6f3c]=column;const cpu=new CPU(m);cpu.pc=0x8f1f;let steps=0;
 while(cpu.pc!==0x8f29){assert(steps++<15,'patched compare setup');cpu.step();}
 assert.equal(m[0x8f2a],returnedX);assert.equal(cpu.x,1);cpu.step();assert.equal(cpu.c,column>=returnedX?1:0);
}
console.log('OK - stage 16 dispatch patches seven targets and the dynamic comparison operand');
