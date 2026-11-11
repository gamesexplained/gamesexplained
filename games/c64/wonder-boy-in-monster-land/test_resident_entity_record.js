'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const fields=[0x1919,0x19e5,0x193b,0x194c,0x197f,0x1990,0x19f6,0x1a18,0x192a,0x1a6d];
for(const start of [0,250]){
 const a=base.slice();a[0xe2]=0;a[0xe3]=0x70;for(let i=0;i<10;i++)a[0x7000+((start+i)&255)]=0x40+i;for(const addr of [0x1a4b,0x1a5c,0x1a29,0x1a3a])a[addr+2]=0x77;a.set([0xa2,2,0xa0,start,0x20,0x9e,0x36,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:100});assert.equal(cpu.pc,0x2f7);fields.forEach((addr,i)=>assert.equal(a[addr+2],0x40+i));for(const addr of [0x1a4b,0x1a5c,0x1a29,0x1a3a])assert.equal(a[addr+2],0);assert.equal(cpu.y,(start+10)&255);
}
console.log('OK - resident entity record copy');
