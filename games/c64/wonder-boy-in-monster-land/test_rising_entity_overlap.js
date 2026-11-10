'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [motion,allocated,playerX,entityX,playerY,entityY,delta,wide,target] of [[1,1,100,110,30,51,3,0,0x6941],[0,0,100,110,30,51,3,0,0x6941],[0,1,100,110,30,51,3,0,0x69a2],[0,1,100,110,30,52,3,0,0x69a2],[0,1,100,110,30,55,3,0,0x6941],[0,1,0,110,30,51,3,0,0x6941],[0,1,100,110,30,52,3,1,0x69a2]]){
 const m=base.slice();m[0x4db3]=motion;m[0x47]=playerX;m[0x48]=0;m[0x4c6f]=entityX;m[0x4c4f]=0;m[0x49]=playerY;m[0x4ccf]=entityY;m[0x192a]=wide;m.set([allocated?0x38:0x18,0xa9,0,0x60],0x1902);
 const cpu=new CPU(m);cpu.pc=0x6939;cpu.a=delta;cpu.x=0;cpu.p&=~8;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.equal(m[0x6942],delta);if(motion===0&&allocated)assert.equal(m[0x6989],wide?25:17);
}
console.log('OK - rising entity overlap branches with display callback stubbed');
