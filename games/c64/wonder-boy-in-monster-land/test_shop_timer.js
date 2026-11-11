'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-routine-observations.json')));let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);const t=o.table;
 for(const carry of [0,1]){const run=m.slice();run[0x10]=0;run[0x70]=run[0x73]=run[0x74]=1;run.set([0xe6,0x10,0x60],0x3c2a);run[0x370b]=0x60;run[0x3c4c]=0x60;run[t-0x3df]=0x60;run.set([carry?0x38:0x18,0x60],t-0x3f2);const cpu=new CPU(run);cpu.pc=t-0x520;cpu.run({until:t-0x4e3,maxSteps:20000});assert.equal(run[0x10],0xdc);assert.equal(run[t-0x352],0);assert.equal(run[t-0x356],0);cases++}
 for(const gate of [0,1]){const run=m.slice();run[t-0x357]=gate;run[0x7b]=3;run[0x4756]=0;const cpu=new CPU(run);cpu.pc=t-0x4e3;cpu.run({until:gate?t-0x5ec:t-0x416,maxSteps:40});if(!gate){assert.equal(run[0x4756],255);assert.equal(cpu.x|cpu.y<<8,t-0x315)}else assert.equal(run[0x4756],0);cases++}
}
console.log(`OK - ${cases} controlled shop countdown paths with delay and input callbacks stubbed`);
