'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const p of ['resident','stage-19'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const answer of [0,1,2,3]){const m=base.slice();m[0x9a4b]=answer;m.set([0x86,0x10,0x84,0x11,0xe6,0x12,0x60],0x77e0);const cpu=new CPU(m);cpu.x=2;cpu.pc=0xbcdc;const target=answer&2?0xbd57:0xbd50;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target);assert.equal(m[0xbe95],2);assert.deepEqual([...m.slice(0x10,0x13)],answer&2?[0xf0,0xbc,1]:[0,0,0]);}
console.log('OK - Sphinx question selection');
