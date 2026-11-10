'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[8,0x9701],[10,0x9f02],[26,0xab6e],[29,0xa2e6]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const counter of [0,8,9,255])for(const random of [0,3,255]){const run=m.slice();run[d+0xaf]=0x60;run.set([0xa9,random,0x60],0x3020);run[0x1ac3]=counter;run[0x1ab2]=0;const cpu=new CPU(run);cpu.pc=d+0x1a;cpu.x=1;cpu.run({until:d+0x3d,maxSteps:80});const next=(counter+1)&255;assert.equal(run[0x1ac3],next);assert.equal(run[0x1ab2],next===10?1:0);if(next===10){assert.equal(run[0x1ad4],23+(random&3));assert.equal(run[0x1ae5],24+(random&3))}}
 for(const value of [0,7,8,20,127,128,255]){const run=m.slice();run[d+0xaf]=0x60;run.set([0x85,0x10,0x60],0x4342);run[0x10]=255;run[0x1ad4]=value;run[0x1ab2]=1;const cpu=new CPU(run);cpu.pc=d+0x3e;cpu.x=1;cpu.run({until:value&128?d+0x3d:d+0x52,maxSteps:80});assert.equal(run[0x1ab2],value&128?2:1);if(!(value&128)){assert.equal(run[0x10],Math.min(value,8));assert.equal(run[0x1ad4],(value-1)&255)}}
 for(const [value,target] of [[0,1],[0,2],[7,99],[255,0],[255,1]]){const run=m.slice();run[d+0xaf]=0x60;run[0x1ad4]=value;run[0x1ae5]=target;run[0x1ac3]=99;run[0x1ab2]=2;const next=(value+1)&255;const cpu=new CPU(run);cpu.pc=d+0x57;cpu.x=1;cpu.run({until:next===target?d+0x3d:0x4368,maxSteps:80});assert.equal(run[0x1ad4],next);assert.equal(run[0x1ab2],next===target?0:2);if(next===target)assert.equal(run[0x1ac3],0);else assert.equal(cpu.a,Math.min(next,8))}
}
console.log('OK - type-12 states 0, 1 and 2 in four loads with callbacks stubbed');
