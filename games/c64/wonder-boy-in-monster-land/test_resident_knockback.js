'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [profile,speed,duration] of [[0,6,5],[1,5,4],[2,4,4],[3,8,4],[4,3,3],[5,2,3]]){
 const a=base.slice();a[0x4dbd]=1;a[0x4dda]=profile;a.set([0xa2,2,0xa0,3,0x20,0x7f,0x72,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:80});assert.equal(cpu.pc,0x2f7);assert.deepStrictEqual([a[0x4daf],a[0x1178],a[0x4db3],a[0x4db5],a[0x4d55],cpu.x,cpu.y],[speed,duration,1,1,1,2,3]);
}
for(const [entityX,direction,facing] of [[120,255,14],[80,1,0]]){
 const a=base.slice();a[0x4ddd]=0;a[0x49]=20;a.set([100,0],0x47);a[0x4dae]=50;a.set([54,30,4,4],0x762e);a[0x4dbd]=1;a[0x4dda]=0;a[0x1a2b]=3;a[0x192c]=0;a[0x4c52]=0;a[0x4c72]=entityX;a.set([0xa2,2,0xa0,7,0x20,0x27,0x72,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:200});assert.equal(cpu.pc,0x2f7);assert.deepStrictEqual([cpu.c,cpu.x,cpu.y],[1,2,7]);assert.deepStrictEqual([...a.slice(0x4daf,0x4db1)],[6,direction]);assert.deepStrictEqual([...a.slice(0x1177,0x1179)],[facing,5]);assert.equal(a[0x4db3],1);assert.equal(a[0x4db5],1);
}
console.log('OK - resident player knockback profiles');
