'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const m=base.slice();m[0x4d6b]=2;m.fill(0,0x10,0x14);m.set([0x86,0x11,0x84,0x12,0xe6,0x13,0x60],0x77e0);m.set([0xe6,0x10,0x60],0x3c2a);m.set([0xce,0x6b,0x4d,0x60],0x370b);
const cpu=new CPU(m);cpu.call(0xa78b,{x:0x79,y:0xa8},{maxSteps:100});assert.equal(m[0x10],2);assert.equal(m[0x11]|m[0x12]<<8,0xa879);assert.equal(m[0x13],1);assert.equal(m[0x4d6b],0);
console.log('OK - first-load message wait with display, frame and HUD callbacks stubbed');
