'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const mem=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)mem.set(r.b,r.a);
mem.fill(0xa5,0xc000,0xc800);mem.fill(0xa5,0xd800,0xdc00);const cpu=new CPU(mem);cpu.x=0;cpu.pc=0x7b2a;cpu.run({until:0x7b55,maxSteps:10000});assert.equal(cpu.pc,0x7b55);
for(const start of [0xc000,0xc400]){assert(mem.slice(start,start+1000).every(v=>v===0));assert(mem.slice(start+1000,start+1024).every(v=>v===0xa5));}
assert(mem.slice(0xd800,0xdbe8).every(v=>v===8));assert(mem.slice(0xdbe8,0xdc00).every(v=>v===0xa5));
console.log('OK - transition clears two 1,000-byte screen regions and colour output');
