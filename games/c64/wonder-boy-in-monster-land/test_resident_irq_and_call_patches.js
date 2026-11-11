'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [entry,target] of [[0x360,0x13ea],[0x1661,0x16b7],[0x1771,0x17b0],[0x17a5,0x13ea],[0x1858,0x13ea],[0x3bbf,0x3bcf],[0x3bf8,0x3c0a],[0x3c17,0x3bb2]]){
 const m=base.slice(),cpu=new CPU(m);cpu.pc=entry;cpu.run({until:entry+8,maxSteps:10});assert.equal(m[0x5e]|m[0x5f]<<8,target);
}
for(const [entry,stop,lowSource,highSource,lowTarget,highTarget,indexRegister] of [[0x2042,0x204e,0x2062,0x2074,0x204f,0x2050,'y'],[0x47de,0x47ea,0x475f,0x4765,0x47fd,0x47fe,'x'],[0x5e9e,0x5eaa,0x4783,0x4789,0x5ead,0x5eae,'x'],[0x68d9,0x68e5,0x1a18,0x1a6d,0x68e6,0x68e7,'x']])for(const [lo,hi] of [[0,0],[0x23,0x81],[255,255]]){
 const m=base.slice();m[lowSource+1]=lo;m[highSource+1]=hi;const cpu=new CPU(m);cpu[indexRegister]=1;cpu.pc=entry;cpu.run({until:stop,maxSteps:10});assert.equal(cpu.pc,stop);assert.equal(m[lowTarget]|m[highTarget]<<8,lo|hi<<8);
}
console.log('OK - eight IRQ destinations and four split call-target patches');
