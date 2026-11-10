'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const kind of ['new','negative','reload','busy']){
 const a=base.slice();a.set([0,0x70],0xe2);a.set([kind==='negative'?0xfe:1,2,3,4,5,6,7,8,9,7,0],0x7000);a[0x4dba]=1;a[0x7c]=kind==='reload'?2:1;a[0x191a]=kind==='busy'?7:0;a[0x1b3a]=1;a[0x1b4b]=1;a[0x1aa1]=0xcc;a.set([0x20,0x22,0x36,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:200});assert.equal(cpu.pc,0x2f3);if(kind==='busy'){assert.equal(a[0x191a],7);assert.equal(a[0x7c],1);}else{assert.deepStrictEqual([0x191a,0x19e6,0x193c,0x194d,0x1980,0x1991,0x19f7,0x1a19,0x192b].map(addr=>a[addr]),[kind==='negative'?0xfe:1,2,3,4,5,6,7,8,9]);assert.equal(a[0x7c],2);assert.equal(a[0x1b3a],1);assert.deepStrictEqual([a[0x1b4b],a[0x1a6e],a[0x1aa1]],{new:[0,7,7],negative:[0,7,0xcc],reload:[2,8,0x96]}[kind]);}
}
console.log('OK - resident entity record scan');
