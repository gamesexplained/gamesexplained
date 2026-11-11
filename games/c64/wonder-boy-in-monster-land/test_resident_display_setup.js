'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
{
 const a=base.slice();a[0x4dbc]=0x55;a[0x300]=255;a.set([0xa5,1,0x29,7,0x8d,0,3,0x60],0x6ccc);const cpu=new CPU(a);cpu.pc=0x364;cpu.run({until:0x382,maxSteps:80});assert.equal(cpu.pc,0x382);assert.equal(a[0x5f],0x13);assert.equal(a[0x4dbc],0);assert.equal(a[0x300],0);assert.equal(a[1],0x35);
}
for(const [high,low,hscroll] of [[1,0,0],[0,0xaa,7],[0,0xab,0]]){
 const a=base.slice();a[0xd012]=0;a[0x7f47]=low;a[0x7f48]=high;a[0x300]=0;a.set([0xee,0,3,0x60],0x6000);a[0x03ab]=0xea;for(const addr of [0x34dd,0x6acb,0x6c87,0x6c04,0x4a43,0x4655,0x6d17,0x6e12,0x4a90,0x18d8,0x1863,0x7979,0x77e2])a.set([0x4c,0,0x60],addr);
 const cpu=new CPU(a);cpu.pc=0x383;cpu.run({until:0x3f1,maxSteps:250});assert.equal(cpu.pc,0x3f1);assert.equal(a[0x300],13);assert.deepStrictEqual([...a.slice(0x4d69,0x4d6b)],[0,hscroll]);assert.equal(a[0x5284],255);assert.equal(a[0x46],0xc0);assert.equal(a[0x526c],0x80);assert.equal(a[0x2c15],1);
}
for(const [port,scan,ticks] of [[0,0,0],[128,255,1]]){
 const a=base.slice();a[0x301]=port;a[0x167e]=1;a[0x167f]=3;a[0x526c]=0;a[0x5274]=10;const cpu=new CPU(a);cpu.pc=0x1665;cpu.run({until:0x16ab,maxSteps:80});assert.equal(cpu.pc,0x16ab);assert.deepStrictEqual([a[0x5f],a[0x5275],a[0x526c],a[0x5274]],[0x16,scan,ticks,11]);
}
console.log('OK - resident transition and display setup');
