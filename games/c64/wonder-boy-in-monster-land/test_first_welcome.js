'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);
for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
{const m=base.slice();m.set([0x86,0x10,0x84,0x11,0xa2,0,0x60],0x77e0);const cpu=new CPU(m);cpu.call(0x9293,{x:0x42},{maxSteps:30});assert.equal(m[0x10]|m[0x11]<<8,0x92a0);assert.equal(cpu.x,0x42);}
{const cpu=new CPU(base.slice());cpu.call(0x934d,{}, {maxSteps:10});assert.equal(cpu.a,9);assert(cpu.p&1);}
{const cpu=new CPU(base.slice());cpu.pc=0x9351;cpu.run({until:0x77e0,maxSteps:10});assert.equal(cpu.pc,0x77e0);assert.equal(cpu.x|cpu.y<<8,0x9358);}
console.log('OK - first-load welcome and message callback entries');
