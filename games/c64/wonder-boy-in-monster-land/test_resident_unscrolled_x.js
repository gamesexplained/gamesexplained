'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,pos,step,next] of [[0x0fc1,0xff,1,0x100],[0x0fc1,0x139,1,0x13a],[0x0fc1,0x13a,1,0x13a],[0x0fc1,0x239,1,0x23a],[0x115b,0x1d,1,0x1c],[0x115b,0x1c,1,0x1c],[0x115b,0,1,0xffff],[0x115b,0x100,1,0xff]]){const a=base.slice();a.set([pos&255,pos>>8],0x47);a[0x4db1]=step;a.set([0x20,pc&255,pc>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:50});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([...a.slice(0x47,0x49)],[next&255,next>>8]);}
for(const [pc,pos,step,next,nextStep] of [[0x0e83,0x100,10,0x108,8],[0x0e83,0x138,3,0x13a,3],[0x101f,0x30,10,0x28,8],[0x101f,0x1e,3,0x1c,3]]){const a=base.slice();a[0x7a]=0;a.set([pos&255,pos>>8],0x47);a[0x4db1]=step;a.set([0x20,pc&255,pc>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:80});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([...a.slice(0x47,0x49)],[next&255,next>>8]);assert.equal(a[0x4db1],nextStep);}
console.log('OK - resident unscrolled player X boundaries');
