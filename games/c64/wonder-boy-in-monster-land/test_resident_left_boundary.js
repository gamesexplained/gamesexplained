'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const records=JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records;
for(const [sum,low,high] of [[10,50,0],[5,50,0],[10,20,0],[10,0,1]]){
 const m=new Uint8Array(65536);for(const r of records)if(r.b)m.set(r.b,r.a);
 m[0x108e]=sum;m[0x47]=low;m[0x48]=high;const cpu=new CPU(m);cpu.pc=0x109d;cpu.run({until:0x10c3,maxSteps:100});assert.equal(cpu.pc,0x10c3);
 const adjustment=(sum-7)&255;let value=(((high<<8)|low)-adjustment-(sum<7?1:0))&65535;if(value<28)value=28;
 assert.deepEqual([m[0x10a9],m[0x47],m[0x48],m[0x4d6a]],[adjustment,value&255,value>>8,7]);
}
console.log('OK - left boundary subtraction preserves borrow and clamps player X');
