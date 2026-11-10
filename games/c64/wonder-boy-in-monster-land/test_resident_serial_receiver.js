'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const mode of [0x60,0x99])for(const values of [[0,0,0,0],[255,255,255,255],[0x31,0x52,0xa4,0xf0],[0x80,1,0x40,3]]){
 const m=base.slice();m.set([0xe0,2],0x7dc5);for(const [i,a] of [0x7ddc,0x7de1,0x7de6,0x7deb].entries())m.set([0xe1+i,2],a);m.set([mode,0,0xc3],0x7ded);m[0x7df8]=0x34;m.set([0x40,...values],0x02e0);m[0xc1]=0;m[0xc2]=2;const target=mode===0x60?0x7ded:0x7dfb,cpu=new CPU(m);cpu.x=0;cpu.y=0x33;cpu.pc=0x7dc4;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);let a=values[0]>>2;a=(a^values[1])>>2;a=(a^values[2])>>2;a^=values[3];assert.equal(cpu.a,a);assert.equal(cpu.x,0);assert.equal(cpu.y,mode===0x60?0x33:0x34);if(mode===0x99)assert.equal(m[0xc333],a);
}
console.log('OK - resident serial receiver with controlled sample reads');
