'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const mode of [0,1])for(const sign of [0,128])for(const allocated of [0,1]){
 const m=base.slice();m.set([allocated?0x38:0x18,0x60],0x190b);m.set([0xe6,0x10,0x60],0x447a);m.set([0xe6,0x11,0x60],0x9d38);m.set([0xe6,0x12,0x60],0x9d5c);m.fill(0,0x10,0x13);m[0x7a]=mode;m.fill(0,0x7d,0x81);m[0x1a2a]=3;m[0x4c72]=0x31;m[0x4c52]=0x32;m[0x4cd2]=0x33;m[0x19e6]=250;m[0x9e27]=sign;m[0x1ab2]=9;
 const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9bea;cpu.run({until:0x9c59,maxSteps:200});assert.equal(cpu.pc,0x9c59);assert.deepEqual([...m.slice(0x10,0x13)],allocated?(mode?[3,0,3]:[3,3,0]):[0,0,0]);assert.equal(m[0x1ae5],3);assert.equal(m[0x1b29],255);assert.equal(m[0x1ab2],0);assert.equal(m[0x19c4],(250+(sign?4:16))&255);assert.equal(m[0x19d5],0);assert.deepEqual([...m.slice(0x7d,0x81)],mode?[0,0,0,0]:[0x31,0x32,0x33,250]);
}
console.log('OK - load 3 type-$07 state 0 setup with stubbed callbacks');
