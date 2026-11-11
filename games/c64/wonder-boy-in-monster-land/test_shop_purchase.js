'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-routine-observations.json'))),bcd=n=>((Math.floor(n/10)<<4)|(n%10)),number=b=>(b>>4)*10+(b&15);let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);const t=o.table;
 for(const negative of [false,true])for(const enough of [false,true]){
  const run=m.slice(),index=negative?4:17,row=t+index*8,price=number(m[row+1])*100+number(m[row]),balance=enough?price:price-1,target=m[row+4]|m[row+5]<<8;assert(price>0);run[t-0x351]=4;run[t-0x350]=17;run[t-0x356]=negative?128:1;run[t-0x357]=0;run[0x4dbd]=0;run[0x4dc9]=bcd(balance%100);run[0x4dc7]=bcd(Math.floor(balance/100));run[0x7b]=3;run[0x4756]=4;run[0x4d6b]=2;run[0x10]=run[0x11]=run[0x12]=run[0x13]=0;run.set([0x85,0x10,0x60],target);run.set([0x86,0x11,0x84,0x12,0x60],0x77e0);run.set([0xe6,0x13,0x60],0x3c2a);run.set([0xce,0x6b,0x4d,0x60],0x370b);
  const cpu=new CPU(run);cpu.pc=t-0x48f;cpu.run({until:enough?t-0x408:t-0x516,maxSteps:500});
  assert.equal(run[0x4dc9],enough?0:bcd(balance%100));assert.equal(run[0x4dc7],enough?0:bcd(Math.floor(balance/100)));assert.equal(run[0x4756],enough?3:4);
  if(enough){assert.equal(run[0x10],index+1);assert.equal(run[0x11]|run[0x12]<<8,t-0x328);assert.equal(run[0x13],2);assert.equal(run[0x4d6b],0)}cases++;
 }
}
console.log(`OK - ${cases} controlled shop purchases and insufficient-funds paths with effect and message callbacks stubbed`);
