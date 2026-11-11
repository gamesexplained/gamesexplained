'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const mem=new Uint8Array(65536);for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)mem.set(r.b,r.a);
const sources=[0xacc7,0xad47,0xadc7,0xae47,0xaec7,0xaf47],dest=[0xd980,0xda00,0xda80,0xdc00,0xe080,0xe100];
const expected=sources.map(a=>mem.slice(a,a+128));for(const a of dest)mem.fill(0,a,a+128);
const cpu=new CPU(mem);cpu.call(0xafc7,{x:0x2b});
for(let i=0;i<6;i++)assert.deepEqual(mem.slice(dest[i],dest[i]+128),expected[i],`source pair ${i+1}`);
assert.equal(cpu.x,0x2b);assert.equal(mem[1],0x35);
console.log('OK - first-load sprite initializer copies six pairs and restores X and banking');
