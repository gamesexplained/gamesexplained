'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const routine of [0x9d38,0x9d5c])for(const selector of [0,1,2])for(const low of [10,250]){
 const m=base.slice();m[0x1b2a]=m[0x1b29]=selector;m.set([0x21,0x22,low],0x7d);m[0x194e]=0x41;m[0x193d]=0x42;m[0x1992]=low;m[0x1981]=0x23;m[0x19e7]=0x31;m[0x9e27]=0x80;m.set([0x20,routine&255,routine>>8,0xea],0x02f0);
 const cpu=new CPU(m);cpu.x=1;cpu.y=2;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});assert.equal(cpu.pc,0x02f3);const offset=[5,20,15][selector];assert.deepEqual([m[0x1ae5],m[0x191a],m[0x1a08],m[0x19e6],m[0x19c4],m[0x1aa1],m[0x1ad4],m[0x1ab2]],[0x80,0x24,1,0xf1,0xf1,0,2,selector]);assert.equal(cpu.y,2);
 if(routine===0x9d38)assert.deepEqual([m[0x19b3],m[0x195e],m[0x196f],m[0x19a2],m[0x9d55]],[1,0x21,0x22,(low+offset)&255,2]);
 else assert.deepEqual([m[0x194d],m[0x193c],m[0x1991],m[0x1980],m[0x9d76]],[0x41,0x42,(low+offset)&255,0x23+(low+offset>255?1:0),2]);
}
console.log('OK - load 3 type-$07 child initialization and position carry');
