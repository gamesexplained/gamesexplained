'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [amount,frame] of [[5,0x77],[0x50,0],[255,255]]){
 const a=base.slice();a.fill(0,0x300,0x302);a.set([0xa9,0xcc,0xa0,0xee,0x60],0x447a);a.set([0x8d,0,3,0x8e,1,3,0x60],0x4342);a.set([0xa2,2,0xa0,frame,0xa9,amount,0x20,0xb5,0x5f,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f9,maxSteps:80});assert.equal(cpu.pc,0x2f9);assert.deepStrictEqual([...a.slice(0x300,0x302)],[12,2]);assert.equal(a[0x5fc6],frame);
 for(const [address,value] of [[0x1ab3,amount],[0x191b,0xfa],[0x19e7,frame],[0x19c5,frame],[0x19f8,7],[0x1a09,0],[0x1af7,0xa0]])assert.equal(a[address],value);
}
console.log('OK - resident type FA initialization');
