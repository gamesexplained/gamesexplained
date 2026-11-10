'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const typ of [0x12,0x21])assert.equal(base[0x7edf+typ]|base[0x7f0f+typ]<<8,0xa5b1);assert.equal(base[0x7edf+0x13]|base[0x7f0f+0x13]<<8,0xa7ff);
for(const [routine,active,state,target] of [[0xa5b1,1,0,0xa5bb],[0xa5b1,0,0,0xa5d4],[0xa5b1,0,1,0xa5ea],[0xa5b1,0,2,0xa66f],[0xa7ff,1,0,0xa8b4],[0xa7ff,127,0,0xa8b4],[0xa7ff,0,0,0xa822],[0xa7ff,128,0,0xa822],[0xa7ff,255,0,0xa822]]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0xa8ac);m[0x10]=0;m[0x1a90]=active;m[0x1ab2]=state;m[0x1a08]=0;const cpu=new CPU(m);cpu.x=1;cpu.pc=routine;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target);
 if(routine===0xa5b1){assert.equal(m[0x1a08],12);if(!active)assert.equal(m[0xa5cc]|m[0xa5cd]<<8,target);}
 else if(target===0xa822){assert.equal(m[0xa81e]|m[0xa81f]<<8,target);assert.equal(m[0x10],1);}else{assert.equal(cpu.a,8);assert.equal(m[0x10],0);}
}
console.log('OK - load 14 entity dispatch active, sign and captured state paths');
