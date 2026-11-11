'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const stubs=[0x331d,0x7119,0x4b20,0x3c2a,0x370b,0x77bc,0x4b0e,0x77a9,0x6dde];for(const a of stubs)base[a]=0x60;
for(const value of [0,1,8,16,248])for(const full of [false,true]){
 const m=base.slice(),cpu=new CPU(m),counts={};m[0x4dbd]=0;m[0x4dbc]=0;m[0x4dcd]=value;m[0x4dcf]=full?value:(value+1)&255;cpu.pc=0x0699;let steps=0;
 while(cpu.pc!==0x0732){assert(++steps<100000,'tally did not finish');if(stubs.includes(cpu.pc))counts[cpu.pc]=(counts[cpu.pc]||0)+1;cpu.step()}
 const drains=Math.max(1,value>>1),refills=((value+8)&255)||256;assert.equal(counts[0x77bc],drains);assert.equal(counts[0x4b0e],drains);assert.equal(counts[0x77a9],refills);assert.equal(counts[0x4b20]||0,full?1:0);assert.equal(counts[0x6dde],1)
 for(let i=0;i<39;i++){assert.equal(m[0xd940+i],1);if(full)assert.equal(m[0xd990+i],1)}
}
console.log('OK - ten tally cases check full-meter bonus, drain count and eight-bit refill loop with callbacks stubbed');
