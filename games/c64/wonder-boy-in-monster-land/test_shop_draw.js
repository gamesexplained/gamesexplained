'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-routine-observations.json')));let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(let index=0;index<24;index++)for(const input of [0x40,0xf0]){
  const run=m.slice(),row=o.table+index*8,target=m[row+2]|m[row+3]<<8,t=o.table;run[0x46]=4;run[0x7b]=3;run[0x477a]=0x20;run.fill(0xee,0x0400,0x0800);const cpu=new CPU(run);cpu.pc=target;cpu.a=input;cpu.run({until:target===t-0x4c?target:t-2,maxSteps:500});
  let count=0,start=0x400+input,first=0;if([4,5,11,12,17,18,23].includes(index)){count=16;first=0x20}else if(index===19){count=12;start=0x400+((input+40)&255);first=0x72}else if(index===20){count=12;start=0x400+((input+40)&255);first=0x66}else if(index===21){count=12;start=0x400+((input+40)&255);first=0x5a}else if(index===22){count=16;first=0x7e}
  for(let i=0;i<16;i++){const addr=start+Math.floor(i/4)*40+i%4;assert.equal(run[addr],i<count?(first+i)&255:0xee,`load ${o.load} index ${index} byte ${i}`)}if(count)assert.equal(run[t-1],0);cases++;
 }
}
console.log(`OK - ${cases} controlled shop tile-drawing paths in 17 loads`);
