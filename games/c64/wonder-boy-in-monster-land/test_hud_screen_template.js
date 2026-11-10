'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const m=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
const template=m.slice(0x4de4,0x4eac);const cpu=new CPU(m);cpu.pc=0x6c87;cpu.run({until:0x6c92,maxSteps:1000});assert.equal(cpu.pc,0x6c92);assert.deepStrictEqual(m.slice(0xc000,0xc0c8),template);
console.log('OK - resident HUD screen template copies 200 bytes');
