'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-20'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const values=[-3,-2,-1,0,1,2,3,...Array(13).fill(4),3,2,1,0,-1,-2,-3,...Array(13).fill(-4)];assert.deepEqual([...base.slice(0xbe21,0xbe49)],values.map(x=>x&255));
for(let index=0;index<40;index++){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x4342);m.set([0x85,0x12,0xe6,0x13,0x60],0x4368);m.fill(0,0x10,0x14);m[0x1ae5]=index;const value=m[0xbe21+index],cpu=new CPU(m);cpu.x=1;cpu.pc=0xbdff;cpu.run({until:0xbe20,maxSteps:40});assert.equal(cpu.pc,0xbe20);assert.deepEqual([...m.slice(0x10,0x14)],value&128?[(-value)&255,1,0,0]:[0,0,value,1]);assert.equal(m[0x1ae5],index===39?0:index+1);
}
console.log('OK - load 20 type-$1B 40-value motion table and index wrap');
