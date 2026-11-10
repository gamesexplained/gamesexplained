'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const stage of [2,254]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x6a75);m[0x10]=0;m.set([0xe0,2],0x7a79);m[0x02e0]=0x80;const cpu=new CPU(m);cpu.a=stage;cpu.pc=0x7a6e;cpu.run({until:0x7a9a,maxSteps:40});assert.equal(cpu.pc,0x7a9a);assert.equal(cpu.a,stage);assert.equal(m[0x10],1);assert.deepEqual([m[1],m[0xd021],m[0xd418],m[0xd015],m[0xd011]],[0x35,0,0,0,0x0b]);
}
for(const [a,x] of [[0x16,0x27],[0,0xfe]]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0xa2,5,0x60],0x77e2);m[0x10]=m[0x11]=0;const cpu=new CPU(m);cpu.a=a;cpu.x=x;cpu.pc=0x7a91;cpu.run({until:0x7a99,maxSteps:20});assert.equal(cpu.pc,0x7a99);assert.deepEqual([m[0x10],m[0x11],m[0x7a98],cpu.x],[a,1,x,x]);
}
console.log('OK - resident transition setup and message X preservation');
