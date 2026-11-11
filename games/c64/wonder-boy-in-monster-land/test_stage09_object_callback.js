'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-09'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
assert.equal(base[0x939e]|base[0x939f]<<8,0x9465);
for(const value of [0,0xa1,0xa2,0xf9]){
 const m=base.slice();m.set([0x86,0x18,0x84,0x19,0xe6,0x1a,0x60],0x0300);m.set([0x85,0x10,0x86,0x11,0x84,0x12,0xe6,0x13,0x60],0x0310);for(const a of [0x948c,0x9493,0x949a,0x94a1])m.set([0,3],a);for(const a of [0x9474,0x947b,0x94a8])m.set([0x10,3],a);m.fill(0,0x10,0x14);m.fill(0,0x18,0x1b);m[0x4dbd]=2;m[0x4de4]=value;m.set([0x20,0x65,0x94,0xea],0x02f0);const cpu=new CPU(m);cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:500});assert.equal(cpu.pc,0x02f3);const match=(value&7)===1;assert.equal(m[0x4de4],match?(value&0xf8)|2:value);assert.deepEqual([...m.slice(0x10,0x14)],[0,0,0,match?1:2]);assert.deepEqual([...m.slice(0x18,0x1b)],match?[0xb5,0x95,4]:[0,0,0]);if(match)assert.deepEqual(m.slice(0xccd0,0xcd18),m.slice(0x94d6,0x951e));
}
console.log('OK - load 9 object callback flag and message paths');
