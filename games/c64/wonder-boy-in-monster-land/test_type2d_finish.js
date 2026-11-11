'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const [input1,input2] of [[0,0],[1,0],[0,1]]){const a=m.slice();a[0x4dc7]=input1;a[0x4dc9]=input2;a.fill(0,0x10,0x16);for(const [addr,z] of [[0x77e0,0x10],[0x3c2a,0x11],[0x370b,0x12],[0x4b20,0x13],[0x6dde,0x14]])a.set([0xe6,z,0x60],addr);a.set([0xe6,0x15,0xa9,0,0x8d,0xc7,0x4d,0x8d,0xc9,0x4d,0x60],0x78d1);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x9972;cpu.run({until:0x0203,maxSteps:300});assert.deepEqual([...a.slice(0x10,0x16)],input1||input2?[3,2,4,1,1,1]:[3,1,3,0,1,0])}
console.log('OK - load-31 type-$2D/$2E finish loop with callbacks stubbed');
