'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [allocated,direction,frame] of [[0,0,10],[1,0,10],[1,128,10],[1,0,250],[1,128,250]]){
 const m=base.slice();m.set(allocated?[0xa2,2,0x38,0x60]:[0x18,0x60],0x190b);m.set([0xe6,0x10,0x60],0x447a);m[0x10]=0;m[0xa6bf]=direction;for(const [a,v] of [[0x194d,0x11],[0x193c,0x22],[0x1991,0x33],[0x1980,0x44],[0x19f7,0x55],[0x1a08,0x66],[0x19e6,frame]])m[a]=v;m[0x1b29]=0;m.set([0x20,0xda,0xa6,0xea],0x02f0);
 const cpu=new CPU(m);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});assert.equal(cpu.pc,0x02f3);assert.equal(cpu.x,1);assert.equal(m[0x10],allocated);
 if(allocated){const addresses=[0x1ac4,0x194e,0x193d,0x1992,0x1981,0x191b,0x19f8,0x1a09,0x1aa2,0x19c5,0x19e7,0x1ad5,0x1b29];assert.deepEqual(addresses.map(a=>m[a]),[direction^128,0x11,0x22,0x33,0x44,0x22,0x55,0x66,0,(frame+18)&255,(frame+18)&255,1,1]);}else assert.equal(m[0x1b29],0);
}
console.log('OK - load 14 type-$12 child allocation and initialization');
