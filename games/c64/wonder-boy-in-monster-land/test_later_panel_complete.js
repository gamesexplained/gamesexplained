'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,start] of [[4,0xa48f],[9,0x9fbb],[19,0xa278],[20,0x9d75],[30,0xaf7c]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 m[0x4dbd]=0;m[0x528c]=4;m[0x7b]=0;m[0x4753]=7;m[start+0x1ea]=0x12;m.fill(0,0x10,0x14);m.set([0x85,0x10,0x84,0x11,0x60],0x7889);m.set([0xe6,0x12,0x60],0x6097);m[0x4a90]=0x60;m[0x370b]=0x60;
 let cpu=new CPU(m);cpu.pc=start+0x100;cpu.run({until:start+0x130,maxSteps:80});assert.equal(cpu.pc,start+0x130);assert.equal(m[0x10],0x12);assert.equal(m[0x11],4);assert.equal(m[0x12],1);assert.equal(m[0x4b0d],0x8c);assert.equal(m[0x4dd4],0);assert.equal(m[0x528c],5);assert.equal(m[0x4753],255);assert.equal(cpu.x|cpu.y<<8,start+0x192);
 m[0x4d6b]=2;m[0x13]=0;m.set([0x86,0x10,0x84,0x11,0x60],0x77e0);m.set([0xe6,0x13,0x60],0x3c2a);m.set([0xce,0x6b,0x4d,0x60],0x370b);cpu=new CPU(m);cpu.call(start+0x130,{x:0x34,y:0x12},{maxSteps:100});assert.equal(m[0x10]|m[0x11]<<8,0x1234);assert.equal(m[0x13],2);assert.equal(m[0x4d6b],0);
}
console.log('OK - five later-load panel completion and message waits with callbacks stubbed');
