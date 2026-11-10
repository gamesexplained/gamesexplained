'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-04'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [phase,count,side,allocation] of [[5,1,0,0],[4,1,0,0],[0,2,0,0],[0,1,0,0],[0,1,1,1]]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0xb646);m.set([0x85,0x11,0xe6,0x12,0x60],0xb636);m.set([0x85,0x13,0xe6,0x14,0x60],0x4342);m.set([side?0x38:0x18,0x60],0x72fc);m.set([0xa2,2,allocation?0x38:0x18,0x60],0x190b);m.set([0xe6,0x15,0x60],0x447a);m.fill(0,0x10,0x16);m[0x1ad4]=phase;m[0x1b29]=count;m[0x1ab2]=1;m[0x195e]=250;m[0x196f]=10;m[0x19a2]=7;m[0x1b18]=0;
 const target=phase?0xb5d0:0xb5b4,cpu=new CPU(m);cpu.x=1;cpu.pc=0xb530;cpu.run({until:target,maxSteps:150});assert.equal(cpu.pc,target);assert.equal(m[0x10],1);
 if(phase){assert.deepEqual([...m.slice(0x11,0x13)],phase>=5?[0,0]:[0,1]);assert.deepEqual([...m.slice(0x13,0x15)],[phase,1]);assert.equal(m[0x1ad4],phase-1);}else if(count===2){assert.equal(m[0x1ab2],2);assert.equal(m[0x15],0);}else{assert.deepEqual([...m.slice(0x11,0x13)],[0,2]);assert.equal(m[0x15],1);assert.equal(m[0x1b18],side?0:12);assert.equal(m[0x1b29],2);assert.equal(m[0x1ab2],2);assert.deepEqual([m[0x195f],m[0x1970],m[0x19a3],m[0x191b],m[0x19e7],m[0x1af7]],[6,11,7,4,0xc7,1]);assert.equal(cpu.x,1);}
}
console.log('OK - load 4 type-$08 state 1 phase and allocation paths');
