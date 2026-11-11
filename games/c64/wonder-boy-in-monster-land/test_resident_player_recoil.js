'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [gate,y,overlap,compare,success] of [[1,20,1,1,0],[0,254,1,1,0],[0,20,0,1,0],[0,20,1,1,1],[0,20,1,0,1]]){
 const a=base.slice();a[0x4ddd]=gate;a[0x49]=y;a[0x4dae]=50;a[0x4db0]=55;a[0x1177]=77;a.fill(0,0x300,0x303);a.set([0xee,0,3,overlap?0x38:0x18,0x60],0x75e3);a.set([0xee,1,3,0x60],0x727f);a.set([0xee,2,3,compare?0x38:0x18,0x60],0x72fc);a.set([0x20,0x27,0x72,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:100});assert.equal(cpu.pc,0x2f3);const called=!gate&&y!==254;assert.deepStrictEqual([...a.slice(0x300,0x303)],[Number(called),success,success]);assert.equal(cpu.c,success);if(called)assert.deepStrictEqual([...a.slice(0x762a,0x762e)],[52,29,8,12]);assert.equal(a[0x4db0],success?(compare?255:1):55);assert.equal(a[0x1177],success?(compare?14:0):77);
}
for(const [bx,hit] of [[54,1],[70,0]]){
 const a=base.slice();a[0x4ddd]=0;a[0x49]=20;a[0x4dae]=50;a.set([bx,30,4,4],0x762e);a[0x300]=0;a.set([0xee,0,3,0x60],0x727f);a.set([0x38,0x60],0x72fc);a.set([0x20,0x27,0x72,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:160});assert.equal(cpu.pc,0x2f3);assert.equal(cpu.c,hit);assert.equal(a[0x300],hit);
}
console.log('OK - resident player contact and recoil');
