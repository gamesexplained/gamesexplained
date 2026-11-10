'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [initial,limit,conversions,refills] of [[4,5,2,5],[0,255,1,1],[1,2,1,3]]){
 const a=base.slice();a[0x4dbd]=1;a[0x4dce]=initial;a[0x4dd0]=limit;a.fill(0,0x300,0x306);a.set([0xee,0,3,0x60],0x3c2a);a.set([0xee,1,3,0x60],0x370b);a.set([0x8d,4,3,0xee,2,3,0xce,0xce,0x4d,0xce,0xce,0x4d,0x60],0x77bc);a.set([0x8d,5,3,0xee,3,3,0xa2,7,0x60],0x4b0e);a.set([0xa2,2,0x20,0x97,0x60,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:1000});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([...a.slice(0x300,0x306)],[2*conversions+refills,2*conversions+refills,conversions,conversions,2,8]);assert.equal(a[0x4dce],limit);assert.equal(a[0x60d6],0);assert.equal(cpu.x,2);
}
console.log('OK - resident meter conversion loops');
