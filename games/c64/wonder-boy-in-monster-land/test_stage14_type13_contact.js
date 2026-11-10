'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [detect,kind,contact] of [[0,0,0],[0,0,1],[1,0,0],[1,128,0],[1,1,1]]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x792c);m.set([detect?0x38:0x18,0x60],0x732a);m.set([contact?0x38:0x18,0x60],0x7227);m[0x10]=0;m[0x1a6e]=kind;const target=detect&&(kind===0||(kind&128))?0xa8a4:contact?0xa89f:0xa89e;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xa88a;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target);assert.equal(m[0x10],1);
}
console.log('OK - load 14 type-$13 contact outcomes with callbacks stubbed');
