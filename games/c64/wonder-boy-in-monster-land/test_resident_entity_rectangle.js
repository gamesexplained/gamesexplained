'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [type,xh,xl,y,dx,w,dy,h] of [[2,0,100,20,3,8,4,12],[2,1,254,250,7,3,10,9],[0,0,0,0,255,1,255,1],[127,1,1,100,0,255,0,255]]){
 const a=base.slice();a[0x191b]=type;a[0x1a2b]=3;a[0x4c52]=xh;a[0x4c72]=xl;a[0x4cd2]=y;const i=(type*2)&255;a.set([dx,w],0x79b6+i);a.set([dy,h],0x7a12+i);a.set([0xa2,2,0x20,0x2c,0x79,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:80});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([...a.slice(0x762e,0x7632)],[(((xh&1)<<7)+(xl>>1)+dx)&255,(y+dy)&255,w,h]);assert.equal(cpu.x,2);assert.equal(cpu.y,i);
}
console.log('OK - resident entity collision rectangles');
