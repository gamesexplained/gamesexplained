'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);
for(const p of ['resident','stage-19'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [active,direction] of [[0,0],[1,0],[1,0x80]]){const m=base.slice();m[0x19e6]=0xfc;m[0x1a90]=active;m[0x1b18]=direction;m[0x1ab2]=5;m.fill(0,0x10,0x12);m.set([0x85,0x10,0x60],0x43f0);m.set([0x85,0x11,0x60],0x43a2);const cpu=new CPU(m);cpu.call(0xbf18,{x:1},{maxSteps:80});assert.equal(m[0x19c4],4);assert.equal(m[0x19d5],6);if(!active)assert.equal(m[0x1ab2],4);else assert.equal(m[direction?0x10:0x11],8);}
console.log('OK - load-19 next entity state with movement callbacks stubbed');
