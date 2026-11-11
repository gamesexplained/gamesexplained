'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [delta,support,contact] of [[0,0,1],[5,1,1],[127,1,2],[255,1,1],[128,1,1],[255,1,2]]){
 const m=base.slice();m.set([0xa9,delta,0x60],0x0300);m.set([0x85,0x10,0xe6,0x11,0x60],0x4368);m.set([0x85,0x12,0xe6,0x13,0x60],0x4342);m.set([0x85,0x14,0xe6,0x15,0x60],0x0c2c);m.set([0x85,0x16,0xe6,0x17,0x60],0x0d7f);m.fill(0,0x10,0x18);m[0x1a19]=0;m[0x1a6e]=3;m[0x192b]=0;m[0x4db8]=support;m[0x4db9]=contact;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x68cb;cpu.run({until:0x6938,maxSteps:100});assert.equal(cpu.pc,0x6938);const negative=Boolean(delta&128),mag=negative?(-delta)&255:delta,move=Boolean(support&&contact===1),expected=negative?[0,0,mag,1,...(move?[0,0,mag,1]:[0,0,0,0])]:[mag,1,0,0,...(move?[mag,1,0,0]:[0,0,0,0])];assert.deepEqual([...m.slice(0x10,0x18)],expected);assert.equal(cpu.x,1);
}
for(const delta of [255,128]){
 const m=base.slice();m.set([0xa9,delta,0x60],0x0300);m[0x1a19]=0;m[0x1a6e]=3;m[0x192b]=0;m[0x4db8]=0;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x68cb;cpu.run({until:0x6939,maxSteps:40});assert.equal(cpu.pc,0x6939);assert.deepEqual([cpu.a,cpu.x],[delta,1]);
}
console.log('OK - resident vertical entity and supported player movement');
