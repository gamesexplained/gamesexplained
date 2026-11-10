'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-routine-observations.json')));let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);const t=o.table;
 {const run=m.slice(),cpu=new CPU(run);run[t-0x356]=0x77;run[t-0x352]=0;cpu.pc=t-0x520;cpu.run({until:t-0x516,maxSteps:20});assert.equal(run[t-0x356],0);assert.equal(run[t-0x352],0xdc);cases++}
 for(const mode of [255,0,1])for(const left of [false,true]){const run=m.slice();run[t-0x356]=mode;run[t-0x357]=1;run[t-0x3df]=0x60;const cpu=new CPU(run);cpu.pc=t+(left?-0x4cd:-0x4af);cpu.run({until:t-0x516,maxSteps:60});const expected=left?(mode===255?255:mode===0?255:0):(mode===255?0:1);assert.equal(run[t-0x356],expected);cases++}
}
console.log(`OK - ${cases} shop mode initialization and bounded local transitions with callbacks stubbed`);
