'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const targets=[0x74e2,0x74e2,0x7632,0x7632,0x763e,0x7646,0x7656,0x7661,0x7707,0x74e2,0x74e2,0x763e,0x7678,0x7688,0x769d,0x76b2,0x76c7,0x76cd];
for(let index=0;index<targets.length;index++){
 const m=base.slice();m[0x191a]=(-index)&255;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x7536;cpu.run({until:targets[index],maxSteps:30});assert.equal(cpu.pc,targets[index]);assert.equal(cpu.y,index);assert.equal(m[0x754c]|m[0x754d]<<8,targets[index]);
}
for(const [entry,msg,flag,counter,value] of [[0x7688,11,0x20,0x4ddf,10],[0x769d,9,0x80,0x4dde,5]])for(const selected of [0,1]){
 const m=base.slice();m[0x4dbd]=selected;m[0x4de2+selected]=1;m[0x10]=0;m.set([0x85,0x10,0xa2,0xaa,0xa0,0xbb,0x60],0x77e2);const cpu=new CPU(m);cpu.pc=entry;cpu.x=3;cpu.y=7;cpu.run({until:0x4454,maxSteps:100});assert.equal(cpu.pc,0x4454);assert.deepEqual([cpu.x,cpu.y,m[0x10],m[0x4de2+selected],m[counter]],[3,7,msg,flag|1,value]);
}
for(const selected of [0,1])for(const [middle,amount,expected,high] of [[0x12,0x23,0x35,0x11],[0x99,1,0,0x12]]){
 const m=base.slice();m[0x4dbd]=selected;m[0x4dc3+selected]=middle;m[0x4dc1+selected]=0x11;const cpu=new CPU(m);cpu.a=amount;cpu.pc=0x4b20;cpu.run({until:0x4b3d,maxSteps:30});assert.equal(cpu.pc,0x4b3d);assert.equal(m[0x4dc3+selected],expected);assert.equal(m[0x4dc1+selected],high);
}
console.log('OK - 18 contact targets, register-restoring messages and middle-byte BCD carry');
