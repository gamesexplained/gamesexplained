'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const a=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)a.set(r.b,r.a);
a[0x46]=0xc4;a.set([0,0x68],0x6c);a[0x7117]=2;const screen=Array.from({length:800},(_,i)=>(i*7)&255),table=Array.from({length:256},(_,i)=>(i*3)&15);a.set(screen,0xc0c8);a.set(table,0x6800);a.set([0xa2,3,0x20,0xd0,0x70,0xea],0x2f0);
const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:30000});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([...a.slice(0xd8c8,0xd8c8+800)],screen.map(x=>table[x]));assert.equal(cpu.x,2);
console.log('OK - resident screen colour mapping');
