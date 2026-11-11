'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const sign of [0,128]){const a=m.slice();a[0x98be]=sign;a[0x19a2]=0x51;a[0x196f]=1;a[0x195e]=0xf1;a[0x49]=0x63;a[0x48]=1;a[0x47]=0x81;a[0x1ab2]=1;a[0x962a]=99;a.set([0xa9,7,0x60],0x3020);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x95e6;cpu.run({until:0x9647,maxSteps:100});assert.equal(a[0x1ab2],3);assert.equal(a[0x1b07],7);assert.equal(a[0x962a],0);assert.deepEqual([...a.slice(0x98bf,0x98c3)],[0xc0,0x31,sign?0xf8:4,0x28])}
console.log('OK - load-31 type-$2D/$2E transition to state 3');
