'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [option,balance,callback,target,meter,msg] of [[0,0,false,0xa78b,0,0xa90c],[255,0,false,0xa69e,0,0],[255,0x30,false,0xa78e,8,0xa995],[255,0x30,true,0xa78e,8,0],[1,0,false,0xa78e,4,0xa97a],[1,0,true,0xa78e,4,0]]){
 const m=base.slice();m[0x7b]=0;m[0x4dbd]=0;m[0x4dc7]=0;m[0x4dc9]=balance;m[0x4783]=0x20;m[0x4789]=0x15;m[0x4753]=5;m[0x476b]=m[0x4777]=0xe0;m[0x4771]=m[0x477d]=callback?2:0;m.fill(0,0x10,0x16);
 m.set([0xe6,0x10,0x60],0x78d1);m.set([0xe6,0x11,0x60],0x2e0);m.set([0x85,0x12,0x60],0x77a9);m.set([0x86,0x13,0x84,0x14,0x60],0x77e0);m.set([0xa9,option,0x4c,0x2e,0xa5],0x2f0);
 const cpu=new CPU(m);cpu.pc=0x2f0;cpu.run({until:target,maxSteps:150});assert.equal(cpu.pc,target);
 if(target===0xa78b)assert.equal(cpu.x|cpu.y<<8,msg);
 if(target===0xa78e){assert.equal(m[0x10],1);assert.equal(m[0x11],callback?1:0);assert.equal(m[0x12],meter);assert.equal(m[0x4753],4);if(msg)assert.equal(m[0x13]|m[0x14]<<8,msg);if(callback)assert.equal(m[option===1?0x4771:0x477d],0);}
}
console.log('OK - first-load payment options with payment, message and meter callbacks stubbed');
