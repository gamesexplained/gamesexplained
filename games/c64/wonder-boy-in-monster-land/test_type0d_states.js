'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[8,0x97e0],[9,0xb97f],[27,0xadba]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 {const run=m.slice(),cpu=new CPU(run);cpu.pc=d+0x1d;cpu.x=1;cpu.run({until:d+0x27,maxSteps:20});assert.equal(run[0x1ad4],0x32);assert.equal(run[0x1ab2],1)}
 for(const timer of [0,1,2,128])for(const direction of [0,128])for(const frame of [0,250,255]){const run=m.slice();run[0x1ac3]=timer;run[0x1ae5]=direction;run[0x19e6]=frame;run[0x1ab2]=3;const neg=((timer-1)&128)!==0,cpu=new CPU(run);cpu.pc=d+0x10a;cpu.x=1;cpu.run({until:neg?d+0x12c:d+0x126,maxSteps:80});assert.equal(run[0x1ac3],(timer-1)&255);assert.equal(run[0x1ab2],neg?0:3);if(!neg)assert.equal(run[0x19c4],((frame+(direction?6:0))&255)+4&255)}
 for(const timer of [0,1])for(const index of [0,3]){const run=m.slice();run[0x1ac3]=timer;run[0x1b18]=index;run[0x10]=run[0x11]=0;run.set([0x86,0x10,0x60],0x4454);run.set([0x85,0x11,0x60],0x4b0e);const cpu=new CPU(run);cpu.pc=d+0x12d;cpu.x=1;cpu.run({until:timer?d+0x132:0x5db9,maxSteps:80});assert.equal(run[0x1ac3],(timer-1)&255);if(!timer){assert.equal(run[0x10],index);assert.equal(run[0x11],0x50);assert.equal(cpu.x,1);if(index)assert.equal(run[d+0x140],1)}}
}
console.log('OK - type-13 states 0, 3 and 4 in three loads with callbacks stubbed');
