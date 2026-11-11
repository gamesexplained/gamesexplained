'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-04'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [acc,offset,frame] of [[4,0,10],[250,10,0],[4,0,250],[250,10,250],[0,255,1]]){
 const m=base.slice();m[0x1b18]=offset;m[0x19e6]=frame;const cpu=new CPU(m);cpu.x=1;cpu.a=acc;cpu.pc=0xb636;cpu.run({until:0xb645,maxSteps:20});assert.equal(cpu.pc,0xb645);const s1=acc+offset,s2=(s1&255)+frame+(s1>255?1:0),s3=(s2&255)+2+(s2>255?1:0);assert.equal(m[0x19c4],s2&255);assert.equal(m[0x19d5],s3&255);
}
console.log('OK - load 4 type-$08 three-addition frame carry chain');
