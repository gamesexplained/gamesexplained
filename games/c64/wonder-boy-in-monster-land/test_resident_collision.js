'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [flag,rem,step,two,tile1,tile2] of [[0,0,1,0,0,0],[1,0,1,0,0,0],[1,15,1,0,1,0],[1,15,1,0,0,0],[1,15,1,1,0,1],[1,15,1,1,0,0]]){
 const a=base.slice();a[0x7a]=flag;a[0x1991]=0x5a+rem;a[0x1980]=0;a[0x85d3]=0;a[0x8624]=0x20;a.set([1,2],0x2001);a.set([tile1,tile2],0x80d0);a.set([0xa9,1,two?0x38:0x18,0x60],0x71db);a.set([0x20,0xde,0x44,0xea],0x02f0);const collision=flag&&rem+step>=16&&(tile1||(two&&tile2)),target=collision?0x02f3:0x4368,cpu=new CPU(a);cpu.a=step;cpu.x=1;cpu.y=2;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.equal(cpu.x,1);assert.equal(cpu.y,2);if(collision){assert.equal(cpu.c,1);assert.equal(a[0x1991],0x69);assert.equal(a[0x1980],0);}else{assert.equal(cpu.a,step);assert.equal(a[0x1991],0x5a+rem);}
}
console.log('OK - resident downward collision: fallback and one/two tile cases');
