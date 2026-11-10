'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
const d=0x954d;for(const random of [0,7,128,135]){const a=m.slice();a[0x1ab2]=0;a[0x10]=0;a.set([0xe6,0x10,0xa9,random,0x60],0x3020);const cpu=new CPU(a);cpu.x=1;cpu.pc=d+0x1e;cpu.run({until:d+0x53,maxSteps:100});assert.equal(a[0x10],random&128?5:2);assert.equal(a[0x1ad4],((random&135)+3)&255);assert.equal(a[0x1ae5],random&128);assert.equal(a[0x1ab2],1);assert.equal(a[0x1af6],10)}
console.log('OK - load-31 type-$2D/$2E state 0 initialization');
