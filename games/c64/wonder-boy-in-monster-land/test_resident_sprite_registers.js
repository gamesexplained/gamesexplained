'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const reused of [false,true])for(const [high,flags,extra] of [[0,0,0],[1,1,1],[1,0,1],[0,1,0]]){
 const a=base.slice();a[reused?0x17e4:0x170d]=1;a[reused?0xd010:0x4d68]=0xaa;a[0xd01c]=0xaa;a[0xd01d]=0xaa;a[0x4c72]=0x34;a[0x4c52]=high;a[0x4c32]=flags;a[0x4cf2]=extra;a[0x4c92]=0xb1;a[0x4cb2]=7;const cpu=new CPU(a);cpu.pc=reused?0x17da:0x1703;cpu.x=2;cpu.y=3;cpu.a=90;cpu.run({until:reused?0x182a:0x1753,maxSteps:100});assert.equal(cpu.pc,reused?0x182a:0x1753);
 const mask=v=>(0xaa&0xfd)|(v&1?2:0);assert.equal(a[reused?0xd002:0x4d5a],0x34);assert.equal(a[reused?0xd010:0x4d68],mask(high));assert.equal(a[0xd003],90);assert.equal(a[0xd01c],mask(flags));assert.equal(a[0xd01d],mask(extra));assert.equal(a[0xc3f9],0xb1);assert.equal(a[0xc7f9],0xb1);assert.equal(a[0xd028]&15,7);
}
console.log('OK - resident first and reused sprite register writes');
// Exercise every index in the seven fields' 32-byte spacing through both emitters.
for(const reused of [false,true])for(let slot=0;slot<32;slot++){
 const a=base.slice(),high=slot&1,flags=(slot>>1)&1,extra=(slot>>2)&1,pointer=0x80+slot,colour=slot&15;
 a[reused?0x17e4:0x170d]=1;a[reused?0xd010:0x4d68]=0xaa;a[0xd01c]=0xaa;a[0xd01d]=0xaa;
 a[0x4c6f+slot]=0x20+slot;a[0x4c4f+slot]=high;a[0x4c2f+slot]=flags;a[0x4cef+slot]=extra;a[0x4c8f+slot]=pointer;a[0x4caf+slot]=colour;
 const cpu=new CPU(a);cpu.pc=reused?0x17da:0x1703;cpu.x=2;cpu.y=slot;cpu.a=90;cpu.run({until:reused?0x182a:0x1753,maxSteps:100});assert.equal(cpu.pc,reused?0x182a:0x1753);
 const mask=v=>(0xaa&0xfd)|(v&1?2:0);assert.equal(a[reused?0xd002:0x4d5a],0x20+slot);assert.equal(a[reused?0xd010:0x4d68],mask(high));assert.equal(a[0xd01c],mask(flags));assert.equal(a[0xd01d],mask(extra));assert.equal(a[0xc3f9],pointer);assert.equal(a[0xc7f9],pointer);assert.equal(a[0xd028]&15,colour);
}
console.log('OK - all 32 indexed display records through both emitters');
