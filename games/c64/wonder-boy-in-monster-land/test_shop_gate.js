'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-routine-observations.json')));let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);const t=o.table,start=t-0x48f;
 for(const [gate,mode,slot] of [[1,128,0],[0,128,0],[0,1,0],[0,0,128],[0,0,0],[0,0,2]]){
  const run=m.slice();run[t-0x357]=gate;run[t-0x356]=mode;run[0x7b]=3;run[0x4756]=slot;const target=gate?(m[start+9]|m[start+10]<<8):mode?t-0x466:t-0x416;const cpu=new CPU(run);cpu.pc=start;cpu.run({until:target,maxSteps:50});
  if(gate)assert.equal(cpu.a,mode);else if(mode)assert.equal(cpu.n,mode&128?1:0);else assert.equal(cpu.x|cpu.y<<8,slot===2?t-0x304:t-0x2ed);cases++;
 }
}
console.log(`OK - ${cases} shop gate and incoming-flag paths`);
