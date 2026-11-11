'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const m=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)m.set(r.b,r.a);
const first=Array.from({length:39},(_,i)=>i&15),second=Array.from({length:39},(_,i)=>(i+5)&15);m.set(first,0xd9b8);m.set(second,0xdad0);let cpu=new CPU(m);cpu.x=0x26;cpu.pc=0x3267;cpu.run({until:0x3274,maxSteps:250});assert.equal(cpu.pc,0x3274);assert.deepEqual([...m.slice(0x82,0xa9)],first);assert.deepEqual([...m.slice(0xa9,0xd0)],second);m.fill(0,0xd9e0,0xda07);m.fill(0,0xdaf8,0xdb1f);cpu=new CPU(m);cpu.pc=0x32eb;cpu.run({until:0x32fa,maxSteps:250});assert.equal(cpu.pc,0x32fa);assert.deepEqual([...m.slice(0xd9e0,0xda07)],first);assert.deepEqual([...m.slice(0xdaf8,0xdb1f)],second);
console.log('OK - resident 39-byte scrolling colour scratch loops');
