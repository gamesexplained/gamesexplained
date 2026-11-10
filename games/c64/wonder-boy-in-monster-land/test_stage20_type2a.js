'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-20'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
assert.equal(base[0x7edf+0x2a]|base[0x7f0f+0x2a]<<8,0xbe8d);
for(const [vertical,phase,frame] of [[63,1,10],[64,1,10],[64,3,250],[255,255,250]]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x4342);m[0x10]=m[0x11]=0;m[0x19a2]=vertical;m[0x1ab2]=phase;m[0x19e6]=frame;const target=vertical<64?0x4454:0xbeb3,cpu=new CPU(m);cpu.x=1;cpu.pc=0xbe8d;cpu.run({until:target,maxSteps:40});assert.equal(cpu.pc,target);assert.deepEqual([...m.slice(0x10,0x12)],[8,1]);assert.equal(m[0x19c4],(frame+((phase<<1)&255))&255);assert.equal(m[0x1ab2],vertical<64?phase:phase===3?0:(phase+1)&255);
}
console.log('OK - load 20 type-$2A frame and height branches');
