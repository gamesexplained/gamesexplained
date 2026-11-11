'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');const {CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const byte of [0,0xff,0xb2,0x81])for(let n=0;n<=16;n++){
 const m=base.slice();m[0x67]=1;m[0x2e0]=0;m.set([0xee,0xe0,0x02,0xa9,byte,0x38,0x60],0x7d89);
 const cpu=new CPU(m);cpu.call(0x7c6a,{x:n,y:0x57},{maxSteps:10000});let value=0;for(let i=0;i<n;i++)value=((value<<1)|((byte>>(i%8))&1))&0xffff;
 assert.equal(cpu.a,value&255,`${byte} ${n} low`);assert.equal(m[0x66],value>>8,`${byte} ${n} high`);assert.equal(m[0x2e0],Math.ceil(n/8),`${byte} ${n} fetches`);assert.equal(cpu.x,0);assert.equal(cpu.y,0x57);
}
// A carry-clear callback branches to the output store with the old A still stacked.
{
 const m=base.slice();m[0x67]=1;m[0x68]=0;m[0x69]=0x40;m.set([0xa9,0xa5,0x18,0x60],0x7d89);
 const cpu=new CPU(m);cpu.pc=0x7c6a;cpu.x=3;cpu.y=5;cpu.sp=0xff;cpu.run({until:0x7c91,maxSteps:1000});
 assert.equal(cpu.a,0xa5);assert.equal(cpu.c,0);assert.equal(cpu.sp,0xfe);assert.equal(m[0x1ff],0);
 cpu.run({until:0x7c93,maxSteps:10});assert.equal(m[0x4005],0xa5);assert.equal(cpu.sp,0xfe);
}
// A nonempty transfer buffer fetches via a self-modified address and restores all flags.
for(const index of [2,127,255])for(const flags of [0,1,2,0x80,0xcf]){
 const m=base.slice();m[0x7d9c]=index;m[0xc300+index]=0xa5;const cpu=new CPU(m);
 cpu.call(0x7d89,{x:7,y:0x57,p:flags|0x20},{maxSteps:100});
 assert.equal(cpu.a,0xa5);assert.equal(m[0x7d9c],(index+1)&255);assert.equal(cpu.p&0xcf,flags&0xcf);assert.equal(cpu.x,7);assert.equal(cpu.y,0x57);
}
// A zero index calls the block receiver and restores Y, the port and flags.
for(const carry of [0,1]){
 const m=base.slice();m[0x7d9c]=0;m[1]=0x35;m[0xc302]=0xa5;
 m.set([0xa9,2,0x8d,0x9c,0x7d,0xa0,0x99,0x60],0x7dab); // controlled block receiver
 const cpu=new CPU(m);cpu.call(0x7d89,{x:7,y:0x57,c:carry},{maxSteps:1000});
 assert.equal(cpu.a,0xa5);assert.equal(cpu.c,carry);assert.equal(cpu.y,0x57);assert.equal(cpu.x,7);assert.equal(m[1],0x35);assert.equal(m[0x7d9c],3);
}
// The real fetch preserves carry clear on this direct-buffer path.
{
 const m=base.slice();m[0x67]=0;m[0x68]=0;m[0x69]=0x40;m[0x7d9c]=2;m[0xc302]=0xa5;
 const cpu=new CPU(m);cpu.pc=0x7c6a;cpu.x=3;cpu.y=5;cpu.sp=0xff;cpu.run({until:0x7c93,maxSteps:1000});
 assert.equal(m[0x4005],0xa5);assert.equal(cpu.sp,0xfe);assert.equal(m[0x1ff],0);assert.equal(m[0x7d9c],3);
}
console.log('OK - bit reader, buffered fetch flags and carry-clear output');
