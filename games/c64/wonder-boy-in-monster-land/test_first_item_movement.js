'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,start,layout,end,desc,cursor] of [[0xa6d4,0xff,0,0xff,0,0],[0xa6d4,0,0,0xff,3,1],[0xa6d4,1,0,0,0,1],[0xa6f2,1,0,1,0,0],[0xa6f2,0,0,1,8,1],[0xa6f2,0xff,0,0,0,1],[0xa6d4,0,1,0xff,0,1],[0xa6f2,0,1,1,0,1]]){
 const m=base.slice();m[0xa84b]=start;m[0xa84a]=layout;m[0xa850]=3;m[0xa851]=8;m[0x10]=m[0x11]=0;m.set([0x85,0x10,0x60],0xa7da);m.set([0xe6,0x11,0x60],0xa7c2);
 const cpu=new CPU(m);cpu.pc=pc;cpu.run({until:0xa68b,maxSteps:40});assert.equal(cpu.pc,0xa68b);assert.equal(m[0xa84b],end);assert.equal(m[0x10],desc);assert.equal(m[0x11],cursor);
}
console.log('OK - first-load item movement with description and cursor callbacks stubbed');
