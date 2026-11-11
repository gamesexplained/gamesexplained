'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const a=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)a.set(r.b,r.a);
const src=Array.from({length:110},(_,i)=>(i*13+7)&255);a.set(src,0x5050);a.set([0x20,0x28,0x48,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:1000});assert.equal(cpu.pc,0x2f3);for(const [dst,expected] of [[0xc00e,Array(22).fill(src[66])],[0xc036,src.slice(0,22)],[0xc05e,src.slice(22,44)],[0xc086,src.slice(44,66)],[0xc0ae,Array(22).fill(src[66])],[0xd886,src.slice(66,88)],[0xd836,src.slice(66,88)],[0xd85e,src.slice(88,110)]])assert.deepStrictEqual([...a.slice(dst,dst+22)],expected);assert.equal(a[0x4dad],0xfe);console.log('OK - resident message rows');
