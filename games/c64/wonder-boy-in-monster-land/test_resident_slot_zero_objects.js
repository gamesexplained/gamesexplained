'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const entry of [0x5ccb,0x5cfe])for(const busy of [0,1]){
 const a=base.slice();a[0x1919]=busy;a[0x4881]=5;a.fill(0,0x400,0x402);a.set([0xee,0,4,0x60],0x5d2c);a.set([0x8d,1,4,0x60],0x43a2);a.set([0x8d,1,4,0x60],0x4342);a.set([0xa2,2,0xa9,0x35,0x20,entry&255,entry>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:150});assert.equal(cpu.pc,0x2f7);if(busy){assert.equal(a[0x4881],6);assert.equal(a[0x400],0);}else{const actual=[0x1919,0x19c3,0x19f6,0x1a07,0x1af5,0x400,0x401].map(address=>a[address]);assert.deepStrictEqual(actual,entry===0x5ccb?[0xfc,0x35,1,0,0xa0,1,8]:[0xfb,0x35,7,0,0x60,1,0x20]);if(entry===0x5ccb)assert.equal(a[0x1ae4],0);}
}
console.log('OK - resident slot-zero objects');
