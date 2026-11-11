'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);
for(const part of ['resident','stage-20'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
m[0x78d1]=0x60;m.fill(1,0x1919,0x192a);m[0x1a29]=0;m.set([0x31,0x32,0x40],0x47);const cpu=new CPU(m);cpu.x=1;cpu.pc=0xbd35;cpu.run({until:0xbd43,maxSteps:200});assert.equal(cpu.pc,0xbd43);assert.equal(cpu.x,255);cpu.run({until:0xbd7b,maxSteps:100});assert.equal(cpu.pc,0xbd7b);assert.deepEqual([m[0x1a18],m[0xbd72],cpu.x],[0x2a,1,1]);
console.log('OK - load 20 full entity table leaves X=$FF and writes $2A to $1A18');
