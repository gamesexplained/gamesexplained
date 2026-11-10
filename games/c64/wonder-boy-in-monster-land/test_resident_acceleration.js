'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const cases=[[0x0e42,3,1,1,3,255,4,3,255],[0x0e42,2,0,0,3,255,4,3,255],[0x0e42,2,0,1,3,255,4,2,255],[0x0e42,2,0,1,0,255,4,1,1],[0x0e42,2,0,1,2,1,4,3,1],[0x0e42,2,0,1,5,1,4,4,1],[0x0e42,2,0,1,4,1,4,4,1],[0x0fdc,3,1,1,3,1,4,3,1],[0x0fdc,2,0,0,3,1,4,3,1],[0x0fdc,2,0,1,3,1,4,2,1],[0x0fdc,2,0,1,0,1,4,1,255],[0x0fdc,2,0,1,2,255,4,3,255],[0x0fdc,2,0,1,5,255,4,4,255],[0x0fdc,2,0,1,4,255,4,4,255]];
for(const [pc,profile,frame,gate,speed,direction,target,nextSpeed,nextDirection] of cases){const a=base.slice();a[0x4dbd]=1;a[0x4dda]=profile;a[0x5274]=frame;a[0xe1]=gate;a.set([speed,direction,0,target],0x4daf);a[0x1177]=99;a.set([0x20,pc&255,pc>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:80});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([...a.slice(0x4daf,0x4db1)],[nextSpeed,nextDirection]);assert.equal(a[0x1177],pc===0x0e42?14:0);}
console.log('OK - resident left and right acceleration');
