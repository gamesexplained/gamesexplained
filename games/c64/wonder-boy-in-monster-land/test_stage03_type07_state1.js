'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const phase of [0,1,128,255]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x9df1);m[0x10]=0;m[0x1ad4]=phase;m[0x1ab2]=1;const target=phase&128?0x9c9a:0x4368;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9c80;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target);assert.equal(m[0x10],1);assert.equal(m[0x1ad4],phase&128?7:(phase-1)&255);assert.equal(m[0x1ab2],phase&128?2:1);if(!(phase&128))assert.equal(cpu.a,8);
}
console.log('OK - load 3 type-$07 state 1 signed phase paths');
