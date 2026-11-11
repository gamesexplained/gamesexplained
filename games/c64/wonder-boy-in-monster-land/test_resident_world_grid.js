'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const cases=[[27,90],[33,105],[34,106],[0,0],[65535,65535],[0x1234,0x5678],[0x100,0x100],[0x1000,0x2000]];let seed=9;for(let i=0;i<1024;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;cases.push([seed&65535,seed>>>16]);}
for(const [wx,wy] of cases){const a=base.slice();a[0x194e]=wx&255;a[0x193d]=wx>>8;a[0x1992]=wy&255;a[0x1981]=wy>>8;a.set([0xa2,2,0x20,0xdb,0x71,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:100});assert.equal(cpu.pc,0x2f5);const px=(wx-27)&65535,py=(wy-90)&65535;assert.deepStrictEqual([cpu.a,cpu.x,cpu.y,cpu.c],[2,(px>>4)&255,(py>>4)&255,Number((px&15)>=7)]);}
for(const [column,row] of [[0,0],[1,1],[255,255]]){const a=base.slice();a[0x4861]=column;a[0x4871]=row;a.set([0xa2,2,0x20,0x2c,0x5d,0xa2,0,0x20,0xdb,0x71,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2fa,maxSteps:180});assert.equal(cpu.pc,0x2fa);assert.deepStrictEqual([cpu.a,cpu.x,cpu.y,cpu.c],[0,column,(row-1)&255,0]);}
console.log('OK - resident world-to-grid conversion');
