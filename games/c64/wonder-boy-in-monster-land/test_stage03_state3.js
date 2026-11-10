'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const timer of [0,2])for(const contact of [0,1]){
 const m=base.slice();m.set([0x60],0x792c);m.set([contact?0x38:0x18,0x60],0x7227);m.set([0x85,0x10,0xe6,0x11,0x60],0x5d7a);m[0x10]=m[0x11]=0;m[0x1ac3]=timer;m[0x19c4]=16;m[0x1ad4]=2;m[0x1ae6]=5;
 const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9eb1;const target=timer?0x9ecc:0x4454;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.deepEqual([...m.slice(0x10,0x12)],contact?[4,1]:[0,0]);assert.equal(m[0x1ac3],(timer-1)&255);
 if(timer)assert.equal(m[0x19c4],14);else {assert.equal(m[0x1ae6],4);assert.equal(cpu.x,1);assert.equal(m[0x9ed8],1);}
}
console.log('OK - load 3 type-$24 state 3 timer, contact and second-slot paths');
