'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,a,x] of [[0xacab,0,5],[0xacb2,1,8],[0xacb9,3,3],[0xacc0,2,5]]){const cpu=new CPU(base.slice());cpu.pc=pc;cpu.run({until:0x536f,maxSteps:10});assert.equal(cpu.pc,0x536f);assert.equal(cpu.a,a);assert.equal(cpu.x,x);}
console.log('OK - first-load item push arguments');
