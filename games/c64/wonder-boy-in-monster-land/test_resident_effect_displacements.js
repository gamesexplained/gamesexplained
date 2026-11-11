'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const records=JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records;
const table=[-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,-6,-5,-4,-3,-2,-1,0,-4,-3,-2,-1,0,-2,-1,0];
for(let phase=0;phase<table.length;phase++){
 const m=new Uint8Array(65536);for(const r of records)if(r.b)m.set(r.b,r.a);
 m[0x4d52]=phase;m[0x4d54]=2;m[0x4d39]=5;m[0x402d]=3;const cpu=new CPU(m);cpu.pc=0x3fb6;const target=table[phase]?0x3fd5:0x3fde;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);
 assert.deepEqual([m[0x4d39],m[0x4d52],m[0x402d],m[0x4d54]],[(5+table[phase])&255,table[phase]?phase+1:phase|128,table[phase]?0:3,1]);
}
console.log('OK - all 26 effect-displacement phases');
