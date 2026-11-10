'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,start] of [[4,0xa48f],[9,0x9fbb],[19,0xa278],[20,0x9d75],[30,0xaf7c]])for(const [left,right,fire,field,targetOffset,messageOffset,wantField] of [[1,1,0,5,0x100,0,5],[0,0,1,5,0xa7,0,5],[1,0,0,5,0x130,0x1a5,255],[1,0,0,7,0x130,0x174,7]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);m[0x7b]=0;m[0x73]=left;m[0x74]=right;m[0x70]=fire;m[0x4753]=field;for(const a of [0x3c2a,0x370b,0x3c4c])m[a]=0x60;
 const cpu=new CPU(m);cpu.pc=start+0xae;cpu.run({until:start+targetOffset,maxSteps:100});assert.equal(cpu.pc,start+targetOffset);assert.equal(m[0x4753],wantField);if(messageOffset)assert.equal(cpu.x|cpu.y<<8,start+messageOffset);if(right===0){assert.equal(m[0x4c73],0x19);assert.equal(m[0x4c74],0x19);assert.equal(m[0x4c53],1);assert.equal(m[0x4c54],1);}
}
for(const [n,start] of [[4,0xa48f],[9,0x9fbb],[19,0xa278],[20,0x9d75],[30,0xaf7c]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);m.set([0x86,0x10,0x84,0x11,0x60],0x77e0);m.set([0x86,0x12,0x84,0x13,0x60],0x719e);const cpu=new CPU(m);cpu.pc=start+0xa4;cpu.x=0x34;cpu.y=0x12;cpu.run({until:start+0xae,maxSteps:30});assert.equal(cpu.pc,start+0xae);assert.deepEqual([...m.slice(0x10,0x14)],[0x34,0x12,0x46,0x82]);
}
console.log('OK - five later-load panel input paths with frame and input callbacks stubbed');
