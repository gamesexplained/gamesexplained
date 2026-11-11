'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
// Carry clear reads bytes from the transfer buffer and stores them backwards.
{
 const m=base.slice();m[0x68]=0;m[0x69]=0x50;m[0x7d9c]=2;m.set([0x11,0x22,0x33,0x44,0x55],0xc302);
 const cpu=new CPU(m);cpu.pc=0x7c8c;cpu.x=0;cpu.y=5;cpu.c=0;cpu.sp=0xff;cpu.run({until:0x7c96,maxSteps:1000});
 assert.deepEqual(Array.from(m.slice(0x5000,0x5005)),[0x55,0x44,0x33,0x22,0x11]);assert.equal(m[0x7d9c],7);assert.equal(cpu.y,0);assert.equal(cpu.c,0);
}
// Carry set copies from the source pointer, also moving backward.
{
 const m=base.slice();m[0x64]=0;m[0x65]=0x60;m[0x68]=0;m[0x69]=0x50;m.set([0x11,0x22,0x33,0x44,0x55],0x6000);
 const cpu=new CPU(m);cpu.pc=0x7c8c;cpu.x=0;cpu.y=5;cpu.c=1;cpu.sp=0xff;cpu.run({until:0x7c96,maxSteps:1000});
 assert.deepEqual(Array.from(m.slice(0x5000,0x5005)),[0x11,0x22,0x33,0x44,0x55]);assert.equal(cpu.y,0);assert.equal(cpu.c,1);
}
// A full-page copy decrements both pointer high bytes before wrapping Y to $FF.
{
 const m=base.slice();m[0x64]=0;m[0x65]=0x60;m[0x68]=0;m[0x69]=0x50;for(let i=0;i<256;i++)m[0x5f00+i]=(i*13+7)&255;
 const cpu=new CPU(m);cpu.pc=0x7c87;cpu.x=1;cpu.y=0;cpu.c=1;cpu.sp=0xff;cpu.run({until:0x7c96,maxSteps:10000});
 assert.deepEqual(m.slice(0x4f00,0x5000),m.slice(0x5f00,0x6000));assert.equal(m[0x65],0x5f);assert.equal(m[0x69],0x4f);assert.equal(cpu.x,0);assert.equal(cpu.y,0);
}
console.log('OK - backwards literal, reference and page copies from the unpacker');
