'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [routine,counter,frame,acc] of [[0xa8ac,0,10,0],[0xa8ac,1,250,0],[0xa8ac,5,250,0],[0xa8ac,255,250,0],[0xa8b4,0,250,8],[0xa8b4,0,10,8]]){
 const m=base.slice();m[0x1b29]=counter;m[0x19e6]=frame;const cpu=new CPU(m);cpu.x=1;cpu.a=acc;cpu.pc=routine;cpu.run({until:0xa8c0,maxSteps:30});assert.equal(cpu.pc,0xa8c0);const first=frame+(routine===0xa8ac?((counter-1)&255)&4:acc);assert.equal(m[0x19c4],first&255);assert.equal(m[0x19d5],((first&255)+2+(first>255?1:0))&255);assert.equal(m[0x1b29],routine===0xa8ac?(counter-1)&255:counter);
}
console.log('OK - load 14 type-$13 frame counter and carry');
