'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [divider,next,inc] of [[6,5,1],[1,0,1],[0,6,0],[255,254,1]]){
 const a=base.slice();a[0x2975]=divider;a[0x526c]=42;a[0x5274]=254;a.set([0x20,0x74,0x29,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:50});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x2975],next);assert.equal(a[0x526c],42+inc);assert.equal(a[0x5274],255);
}
console.log('OK - resident divider cases');
