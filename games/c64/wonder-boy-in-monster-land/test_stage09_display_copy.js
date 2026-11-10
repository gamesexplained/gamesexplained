'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-09'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const changes of [[],[[0,0x12],[71,0x34]],[[7,0xfe],[40,0x81]]]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x0300);m.set([0x85,0x11,0x86,0x12,0x84,0x13,0x60],0x0310);m.set([0,3],0x94a1);m.set([0x10,3],0x94a8);m.fill(0,0x10,0x14);for(const [offset,value] of changes)m[0x94d6+offset]=value;const src=m.slice(0x94d6,0x951e),vals=m.slice(0x94cd,0x94d6),cpu=new CPU(m);cpu.pc=0x94a0;cpu.run({until:0x94cc,maxSteps:500});assert.equal(cpu.pc,0x94cc);assert.deepEqual(m.slice(0xccd0,0xcd18),src);assert.deepEqual(m.slice(0x5023,0x5026),vals.slice(0,3));assert.deepEqual(m.slice(0x5038,0x503b),vals.slice(3,6));assert.deepEqual(m.slice(0x504d,0x5050),vals.slice(6,9));assert.deepEqual([...m.slice(0x10,0x14)],[1,0,0,0]);
}
console.log('OK - load 9 copies its 72-byte block and parameter tables');
