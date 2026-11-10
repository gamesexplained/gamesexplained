'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [down,state,latch,world,horiz,mapval,move] of [[0,0,0,1,0,1,true],[0,0,0,1,1,1,true],[0,0,0,1,2,1,false],[1,0,0,1,0,1,false],[0,255,0,1,0,1,false],[0,0,0,1,0,2,false],[0,0,0,0,0,1,false]]){
 const a=base.slice();a[0x6f]=0;a[0x72]=down;a[0x4db3]=state;a[0x4dbb]=latch;a[0x7a]=world;a[0x527c]=horiz;a[0x527d]=15;a[0x61d7]=mapval;a.set([1,3,4,5,6,7],0x7f77);a[0x5243]=0;a.fill(0,0x300,0x303);
 a.set([0xee,0,3,0x60],0x101f);a.set([0xee,1,3,0x60],0x0c2c);a.set([0xee,2,3,0x38,0x60],0x53e0);a.set([0x20,0x41,8,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:200});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([...a.slice(0x300,0x302)],move?[1,1]:[0,0]);
 if(move){assert.equal(a[0x4db3],255);assert.equal(a[0x527d],2);}else assert.equal(a[0x302],Number(!down&&state!==255&&(!world||mapval!==1)));
}
console.log('OK - resident down action and map gates');
