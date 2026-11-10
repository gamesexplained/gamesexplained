'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [timer,sign,random,mode,phase] of [[0,0,0,0,0],[0,128,128,0,0],[2,0,0,128,5],[2,0,0,1,1],[2,128,0,128,1]]){
 const m=base.slice();m[0xa88a]=0x60;m.set([0xa9,random,0x60],0x3020);m.set([0x85,0x10,0xe6,0x11,0x60],0x43a2);m.set([0x85,0x12,0xe6,0x13,0x60],0x43f0);m.set([0x85,0x14,0xe6,0x15,0x60],0x4342);m.set([0x85,0x16,0xe6,0x17,0x60],0x4368);m.fill(0,0x10,0x18);m[0x1ac3]=timer;m[0x1ad4]=sign;m[0x1ae5]=mode;m[0x1af6]=phase;
 const target=timer===2&&mode===128&&phase===5?0xa878:timer===2&&mode===1&&phase===1?0xa889:0xa860;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xa822;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);const finalsign=timer===0?sign^128:sign,finaltimer=timer===0?11:timer-1,startmode=timer===0&&random<128?1:mode,startphase=timer===0&&random<128?5:phase,finalmode=(startmode&128)&&startphase===5?0:startmode&&!(startmode&128)&&startphase===1?255:startmode,finalphase=startmode&128?(startphase+1)&255:startmode?(startphase-1)&255:startphase;assert.deepEqual([m[0x1ac3],m[0x1ad4],m[0x1ae5],m[0x1af6]],[finaltimer,finalsign,finalmode,finalphase]);assert.deepEqual([...m.slice(0x10,0x18)],[...(finalsign&128?[8,1,0,0]:[0,0,8,1]),...(startmode&128?[0,0,startphase,1]:startmode?[startphase,1,0,0]:[0,0,0,0])]);
}
console.log('OK - load 14 type-$13 state 0 timer, random and animation');
