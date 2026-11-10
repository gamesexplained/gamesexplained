'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);
for(const part of ['resident','stage-04'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
m.fill(1,0x1919,0x192a);m[0x1a29]=0;m[0x1ab2]=1;m[0x195e]=250;m[0x196f]=10;m[0x19a2]=7;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xb571;cpu.run({until:0xb579,maxSteps:200});assert.equal(cpu.pc,0xb579);assert.deepEqual([cpu.x,cpu.y],[255,1]);cpu.run({until:0xb5b4,maxSteps:100});assert.equal(cpu.pc,0xb5b4);assert.deepEqual([m[0x1a18],m[0x1bf4],m[0x1ab2],cpu.x],[4,1,2,1]);
console.log('OK - full entity table leaves X=$FF and setup writes outside its slots');
