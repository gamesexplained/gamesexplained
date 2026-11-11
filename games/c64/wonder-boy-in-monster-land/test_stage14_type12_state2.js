'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [counter,timer,carry] of [[0,9,0],[1,9,0],[1,9,1],[1,6,0],[1,0,1]]){
 const m=base.slice();m.set([carry?0x38:0x18,0x60],0x72fc);m.set([0xe6,0x11,0x60],0xa6da);m[0x11]=m[0xa6bf]=0;m[0xa6c1]=counter;m[0x1ac3]=timer;m[0x19e6]=250;m[0x19c4]=0;const target=counter&&timer===0?0xa5d4:0xa6aa;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xa66f;cpu.run({until:target,maxSteps:80});assert.equal(cpu.pc,target);assert.equal(m[0xa6c1],counter+1);assert.equal(m[0x1ac3],counter?(timer-1)&255:timer);
 if(counter){const first=250+(carry?2:10),offset=[0,2,4,6,6,4,4,4,2,0][timer];assert.equal(m[0x19c4],(first+offset+(first>255?1:0))&255);assert.equal(m[0xa6bf],carry?128:0);assert.equal(m[0x11],timer===6?1:0);}else{assert.equal(m[0x19c4],0);assert.equal(m[0x11],0);}
}
for(const [detect,kind,contact] of [[0,0,0],[0,0,1],[1,0,0],[1,128,0],[1,1,1]]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x792c);m.set([detect?0x38:0x18,0x60],0x732a);m.set([contact?0x38:0x18,0x60],0x7227);m[0x10]=m[0xa6c1]=0;m[0x1a6e]=kind;const target=detect&&(kind===0||(kind&128))?0xa65f:contact?0xa64a:0xa6be;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xa66f;cpu.run({until:target,maxSteps:80});assert.equal(cpu.pc,target);assert.equal(m[0x10],1);assert.equal(m[0xa6c1],1);
}
console.log('OK - load 14 type-$12 state 2 carry, timer and contact paths');
