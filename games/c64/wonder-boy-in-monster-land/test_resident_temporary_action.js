'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [state,col] of [[0,0],[5,9],[255,7]]){
 const a=base.slice();a[0x6f]=state;a[0x529c]=col;a[0x72]=1;a[0x5243]=2;a.set([0x20,0xe0,8,0xa5,0x6f,0x8d,0,4,0xad,0x9c,0x52,0x8d,1,4,0x20,0x41,8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x301,maxSteps:100});assert.equal(cpu.pc,0x301);assert.deepStrictEqual([0x400,0x401,0x6f,0x529c,0x848,0x84c,0x5243].map(address=>a[address]),[1,15,state,col,state,col,1]);
}
console.log('OK - resident temporary action state');
