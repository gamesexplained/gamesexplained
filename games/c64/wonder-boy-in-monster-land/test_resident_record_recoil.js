'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [offset,entity,spawn,recoil] of [[10,0,false,false],[11,1,false,true],[11,0,true,true]]){
 const a=base.slice();a[0x4881]=9;a[0x527d]=offset;a[0x1919]=entity;a[0x4861]=3;a[0x4871]=4;a[0x1178]=0x55;a.set([0xa2,2,0xa0,7,0xa9,0xa7,0x20,0xab,0x72,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f9,maxSteps:160});assert.equal(cpu.pc,0x2f9);assert.equal(a[0x4881],10);assert.equal(cpu.x,2);assert.equal(a[0x1178],recoil?16:0x55);if(recoil)assert.deepStrictEqual([a[0x4db3],a[0x4db5],a[0x4d55]],[1,1,1]);if(spawn)for(const [addr,value] of [[0x1919,0x2b],[0x19e5,0xa7],[0x19c3,0xa7],[0x19f6,15],[0x1ab1,8],[0x194c,75],[0x193b,0],[0x1990,153],[0x197f,0]])assert.equal(a[addr],value);
}
for(const [count,next,frame,release] of [[1,0,0x55,1],[2,1,0xa9,0],[3,2,0xa7,0],[0,255,0xa9,0]]){
 const a=base.slice();a[0x1ab3]=count;a[0x19e7]=0xa7;a[0x19c5]=0x55;a[0x300]=0;a.set([0xee,0,3,0x60],0x4454);a.set([0xa2,2,0x20,0xe6,0x72,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:60});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([a[0x1ab3],a[0x19c5],a[0x300]],[next,frame,release]);
}
console.log('OK - conditional resident record-recoil sequence');
