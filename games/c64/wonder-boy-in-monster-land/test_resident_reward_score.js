'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const value of [0,1,15,16,255]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x4b0e);m.set([0x85,0x12,0xe6,0x13,0x60],0x4b20);m.set([0x85,0x14,0xe6,0x15,0x60],0x77e2);m.fill(0,0x10,0x16);m.set([0x66,0],0x4f12);const cpu=new CPU(m);cpu.a=value;cpu.pc=0x7771;cpu.run({until:0x77a8,maxSteps:100});assert.equal(cpu.pc,0x77a8);assert.deepEqual([...m.slice(0x10,0x16)],[(value<<4)&255,1,value>>4,1,3,1]);assert.equal(m[0x778b],value>>4);assert.deepEqual([...m.slice(0x4f12,0x4f14)],[value<16?0x66:(value>>4)+1,(value&15)+1]);
}
console.log('OK - resident reward conversion and digit display');
