'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [gate,health,other,xpos,contact,mode] of [[0,1,0,50,1,0],[0,2,1,107,0,0],[0,2,1,107,1,0],[0,2,1,108,1,0],[0,2,1,115,1,0],[0,2,1,116,1,1],[0,2,1,121,1,0],[0,2,1,122,1,0],[1,2,1,50,1,0]]){
 const a=base.slice();a[0x4ddd]=gate;a[0x4dbd]=0;a[0x4dd7]=health;a[0x4db7]=other;a[0x4a]=xpos;a[0x49]=20;a[0x4dae]=50;a[0x1177]=mode;a[0x10]=0;a.set([0xe6,0x10,contact?0x38:0x18,0x60],0x75e3);a.set([0x20,0x79,0x11,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});const adjusted=xpos>=116?(xpos-14)&255:xpos,call=!gate&&health!==0&&other!==0&&adjusted<108;assert.equal(cpu.pc,0x02f3);assert.equal(cpu.c,call&&contact?1:0);assert.equal(a[0x10],call?1:0);if(call){assert.deepEqual([...a.slice(0x762a,0x762e)],[xpos>=116?60:50,26,4,11]);if(contact)assert.deepEqual([...a.slice(0x4daf,0x4db1)],[(5-health)&255,mode?255:1]);}
}
for(const [bx,expected] of [[54,1],[55,0]]){
 const a=base.slice();a[0x4ddd]=0;a[0x4dbd]=0;a[0x4dd7]=2;a[0x4db7]=1;a[0x4a]=50;a[0x49]=20;a.set([50,77,88],0x4dae);a[0x1177]=0;a.set([bx,37,4,4],0x762e);a.set([0x20,0x79,0x11,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:150});assert.equal(cpu.pc,0x02f3);assert.equal(cpu.c,expected);assert.deepEqual([...a.slice(0x4daf,0x4db1)],expected?[3,1]:[77,88]);
}
console.log('OK - resident contact gate, boundary and contact cases');
