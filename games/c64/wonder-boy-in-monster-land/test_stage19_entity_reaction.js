'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);
for(const p of ['resident','stage-19'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const c of [{kind:'odd',timer:0},{kind:'even',timer:255},{kind:'zero',timer:1,collision:1,param:0},{kind:'hit',timer:1,collision:1,param:2},{kind:'contact',timer:21,collision:0},{kind:'random_high',timer:0xed,random:0x80},{kind:'random_low',timer:0xed,random:0}]){
 const m=base.slice();m[0x1b29]=c.timer;m[0x1a6e]=c.param||0;m[0x19e6]=0x20;m[0x1ab2]=0;m.fill(0,0x10,0x13);m[0x792c]=0x60;m.set([c.collision?0x38:0x18,0x60],0x732a);m.set([0x38,0xa9,0,0x60],0x72fc);m.set([0x38,0x60],0x7227);m.set([0x85,0x10,0x60],0x5d7a);m.set([0xe6,0x11,0x60],0xbde0);m.set([0xa9,c.random||0,0x60],0x3020);
 const cpu=new CPU(m);cpu.call(0xbe96,{x:1},{maxSteps:100});
 if(c.kind==='zero')assert.equal(m[0x11],1);
 if(c.kind==='hit'){assert.equal(m[0x1b18],0x80);assert.equal(m[0x1ab2],1);}
 if(c.kind==='contact'){assert.equal(m[0x10],8);assert.equal(m[0x19c4],0x24);assert.equal(m[0x19d5],0x26);}
 if(['odd','even','random_high','random_low'].includes(c.kind)){const high=['odd','random_high'].includes(c.kind);assert.equal(m[0x195e],high?10:40);assert.equal(m[0x196f],high?1:0);if(c.kind.startsWith('random'))assert.equal(m[0x1b29],30);}
}
console.log('OK - load-19 entity reaction with callbacks stubbed');
