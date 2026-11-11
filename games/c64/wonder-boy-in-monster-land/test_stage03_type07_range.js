'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [point,position] of [[44,0],[45,0],[60,20],[100,5],[255,5]]){
 const m=base.slice();m.set([0xa9,position,0x85,0x7d,0x60],0x9d25);m[0x49]=point;m[0x1ab2]=9;m[0x1ad4]=m[0x1af6]=7;const inside=point>=45&&point-45>=position,target=inside?0x9c79:0x9c7f;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9c5a;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.equal(m[0x1ab2],inside?1:0);if(inside){const value=Math.floor((point-45-position)/8);assert.equal(m[0x1ad4],value);assert.equal(m[0x1af6],(value-2)&255);}
}
console.log('OK - load 3 type-$07 phase subtraction and wrap boundaries');
