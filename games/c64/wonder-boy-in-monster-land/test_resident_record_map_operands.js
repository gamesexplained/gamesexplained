'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const part of ['resident','stage-02'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [flag,mode,stride] of [[0,0,40],[128,0,40],[128,1,40],[0,0,255]]){
 const m=base.slice();m[0x7b]=1;m[0x7a]=mode;m[0x4748]=0x30;m[0x474e]=2;m[0x4754]=flag;m[0x85d0]=0xf0;m[0x8621]=0x60;m[0x7f4a]=stride;m.set([0x11,0x12,0x13,0x14],0x7d);m.set([0x21,0x22,0x23,0x24,0x31,0x32,0x33,0x34],0x7f6d);const cpu=new CPU(m);cpu.y=0x27;cpu.pc=0x46d6;cpu.run({until:0x4746,maxSteps:100});assert.equal(cpu.pc,0x4746);const values=!flag?[0x11,0x12,0x13,0x14]:mode?[0x31,0x32,0x33,0x34]:[0x21,0x22,0x23,0x24];assert.equal(m[0x6120],stride===255?values[3]:values[0]);assert.equal(m[0x6121],values[1]);assert.equal(m[0x6120+stride],values[2]);if(stride!==255)assert.equal(m[0x6121+stride],values[3]);assert.deepEqual([m[0x54],m[0x55],m[0x471c],m[0x4723],m[0x4745],cpu.y],[0x20,0x61,2,0x30,0x27,0x27]);
}
console.log('OK - resident record map replacement sources and operand wrap');
