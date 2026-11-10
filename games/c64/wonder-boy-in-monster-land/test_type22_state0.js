'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[2,0xbe7e],[4,0xb6a6],[6,0xb912],[14,0xa733],[15,0xaa9c],[17,0xa093],[24,0xa0fa],[25,0xa37d]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [active,sign,carry] of [[0,0,0],[1,0,0],[1,128,0],[1,0,1],[1,128,1]]){const m=original.slice();m[0x1a2a]=active;m[0x1ac3]=sign;m[0x1ab2]=0;m[0x1af6]=m[0x1ae5]=7;m.fill(0,0x10,0x14);m[d+0xb5]=0x60;m.set([0x85,0x12,0xe6,0x10,carry?0x38:0x18,0x60],0x45bc);m.set([0x85,0x13,0xe6,0x11,carry?0x38:0x18,0x60],0x4574);const target=d+(!active?0xa4:carry?0x4b:sign&128?0x3b:0x35),cpu=new CPU(m);cpu.x=1;cpu.pc=d+0x18;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.deepEqual([...m.slice(0x10,0x14)],!active?[0,0,0,0]:sign&128?[0,1,0,8]:[1,0,8,0]);if(active){assert.equal(m[d+0xcb],sign);if(carry){assert.equal(m[0x1ab2],1);assert.equal(m[0x1ae5],3);assert.equal(m[0x1af6],0)}}
 }
}
console.log('OK - type-$22 state 0 branches in eight loads');
