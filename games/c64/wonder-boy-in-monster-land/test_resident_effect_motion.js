'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [mode,phase,speed,direction,carry,nextSpeed,nextDirection,which] of [[0,11,3,1,0,2,1,1],[0,18,3,0x80,1,2,0,2],[0,23,0,1,0,0,1,1],[0,25,3,1,1,2,0x81,1],[0,10,3,0,1,3,0,0],[128,11,3,1,0,3,1,1],[128,11,3,0x80,1,3,0,2],[128,11,3,0,0,3,0,0]]){
 const a=base.slice();a[0x4d51]=mode;a[0x4d52]=phase;a[0x4d45]=speed;a[0x4d3d]=direction;a.fill(0,0x300,0x302);const flag=carry?0x38:0x18;
 a.set([0x8d,0,3,0xa9,1,0x8d,1,3,flag,0x60],0x3f56);a.set([0x8d,0,3,0xa9,2,0x8d,1,3,flag,0x60],0x3f2e);a.set([0xa2,2,0x20,0xc6,0x3e,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:100});assert.equal(cpu.pc,0x2f5);assert.equal(a[0x4d45],nextSpeed);assert.equal(a[0x4d3d],nextDirection);assert.deepStrictEqual([...a.slice(0x300,0x302)],which?[nextSpeed,which]:[0,0]);
}
for(const [pc,high,low,step,nextHigh,nextLow,slot0,carry] of [[0x3f2e,0,29,1,0,28,55,0],[0x3f2e,0,28,1,0,27,28,1],[0x3f2e,1,0,1,0,255,55,0],[0x3f2e,0,0,1,255,255,55,0],[0x3f56,1,60,1,1,61,55,1],[0x3f56,1,61,3,1,61,55,1],[0x3f56,0,255,1,1,0,55,0],[0x3f56,0,100,10,0,110,55,0]]){
 const a=base.slice();a[0x4d29]=55;a[0x4d2b]=low;a[0x4d33]=high;a.set([0xa2,2,0xa9,step,0x20,pc&255,pc>>8,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:80});assert.equal(cpu.pc,0x2f7);assert.equal(a[0x4d29],slot0);assert.equal(a[0x4d2b],nextLow);assert.equal(a[0x4d33],nextHigh);assert.equal(cpu.c,carry);
}
for(const [high,low,direction,nextLow,slot0,nextDirection] of [[1,60,1,61,55,0x81],[0,28,0x80,27,28,0]]){
 const a=base.slice();a[0x4d51]=0;a[0x4d52]=10;a[0x4d45]=1;a[0x4d3d]=direction;a[0x4d29]=55;a[0x4d2b]=low;a[0x4d33]=high;a.set([0xa2,2,0x20,0xc6,0x3e,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:120});assert.equal(cpu.pc,0x2f5);assert.equal(a[0x4d2b],nextLow);assert.equal(a[0x4d29],slot0);assert.equal(a[0x4d3d],nextDirection);
}
console.log('OK - resident effect-slot motion and limits');
