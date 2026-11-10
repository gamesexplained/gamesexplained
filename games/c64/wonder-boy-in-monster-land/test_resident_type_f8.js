'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [tier,frame] of [[0,0x55],[3,0x77],[255,0xff]]){
 const a=base.slice();a[0x4dbd]=1;a[0x4ddc]=tier;a[0x7f6c]=frame;a.fill(0,0x300,0x303);a[0x447a]=0x60;a.set([0x8d,0,3,0xa2,7,0x60],0x77e2);a.set([0x8d,1,3,0x8e,2,3,0x60],0x4342);a.set([0xa2,2,0x20,8,0x60,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:100});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([...a.slice(0x300,0x303)],[(tier+17)&255,12,2]);assert.equal(a[0x6020],2);
 for(const [address,value] of [[0x191b,0xf8],[0x19e7,frame],[0x19c5,frame],[0x19f8,15],[0x1a09,0],[0x1aa2,7]])assert.equal(a[address],value);
}
for(const [frame,aux,nextAux] of [[0,0,1],[77,1,1],[255,255,255]]){
 const a=base.slice();a[0x19e7]=frame;a[0x19c5]=0x55;a[0x1a80]=aux;a.set([0xa2,2,0x20,0x86,0x60,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:40});assert.equal(cpu.pc,0x2f5);assert.equal(a[0x19c5],frame);assert.equal(a[0x1a80],nextAux);
}
console.log('OK - resident type F8 initialization and update');
