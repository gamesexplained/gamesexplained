'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [phase,timer] of [[7,3],[8,3],[8,0],[255,0]]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x9d18);m[0x9df1]=0x60;m[0x10]=0;m[0x1ad4]=phase;m[0x1af6]=timer;m[0x1ab2]=3;m.set([0x20,0xe0,0x9c,0xea],0x02f0);
 const cpu=new CPU(m);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});assert.equal(cpu.pc,0x02f3);const expected=phase<8?[phase+1,timer,3,1]:timer?[phase,timer-1,3,1]:[2,255,4,2];assert.deepEqual([m[0x1ad4],m[0x1af6],m[0x1ab2],m[0x10]],expected);
}
for(const phase of [0,3,128,255]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x9d18);m.set([0xe6,0x11,0x60],0x9df1);m[0x10]=m[0x11]=0;m[0x1ad4]=phase;m[0x1ab2]=4;m[0x1b07]=7;m.set([0x20,0x01,0x9d,0xea],0x02f0);
 const cpu=new CPU(m);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});assert.equal(cpu.pc,0x02f3);const expected=phase&128?[phase,0,0,0,1]:[(phase-1)&255,4,7,1,1];assert.deepEqual([m[0x1ad4],m[0x1ab2],m[0x1b07],m[0x10],m[0x11]],expected);
}
console.log('OK - load 3 type-$07 states 3 and 4, with callbacks stubbed');
