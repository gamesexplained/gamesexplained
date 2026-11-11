'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [cool,flag,charge,meter,nmeter,ncool,nflag,ncharge,carry,msg] of [[3,0,2,10,10,3,0,2,0,0],[0,0,2,10,5,40,0,2,1,0],[0,128,2,10,8,40,128,1,1,0],[0,128,1,10,8,40,0,0,1,10],[0,128,0,10,8,40,128,255,1,0]]){
 const a=base.slice();a[0x4dbd]=1;a[0x4dce]=meter;a[0x4de3]=flag;a[0x4dde]=charge;a[0x4de1]=cool;a.fill(0,0x400,0x403);a.set([0x8d,2,4,0xa2,9,0xa0,8,0x60],0x77e2);a.set([0xa2,2,0xa0,3,0xa9,5,0x20,0x7a,0x5d,0x08,0x68,0x8d,0,4,0x8e,1,4,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x302,maxSteps:150});assert.equal(cpu.pc,0x302);assert.deepStrictEqual([0x4dce,0x4de1,0x4de3,0x4dde,0x401,0x402].map(address=>a[address]),[nmeter,ncool,nflag,ncharge,2,msg]);assert.equal(a[0x400]&1,carry);
}
console.log('OK - resident damage and protection');
