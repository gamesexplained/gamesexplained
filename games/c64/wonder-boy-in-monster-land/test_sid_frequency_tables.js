'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(let i=0;i<96;i++){
 const m=base.slice(),lo=m[0x2500+i],hi=m[0x2560+i];m[0x223a]=0;m[0x2455]=i;
 const cpu=new CPU(m);cpu.pc=0x23b7;cpu.x=0;cpu.run({until:0x23ca,maxSteps:20});assert.equal(cpu.pc,0x23ca);assert.equal(m[0xd400],lo);assert.equal(m[0xd401],hi);
}
console.log('OK - all 96 resident SID frequency table pairs');
