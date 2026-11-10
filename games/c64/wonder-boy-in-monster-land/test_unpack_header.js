'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const original=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)original.set(r.b,r.a);
for(const data of [Array(26).fill(0),Array.from({length:26},(_,i)=>(i*37+11)&255)]){
 const m=original.slice();m.set([0x4c,0,3],0x7d89); // buffered-byte callback stub
 m.set([0xad,0,0xc3,0xee,1,3,0x38,0x60],0x0300);m.set([0x42,0x31,1,...data],0xc300);
 const cpu=new CPU(m);cpu.pc=0x7c2c;cpu.sp=0xff;cpu.run({until:0x7c96,maxSteps:10000});
 assert.equal(m[0x68],0x31);assert.equal(m[0x69],0x42);assert.equal(m[0x301],29);assert.equal(cpu.y,0);
 let base=1,previous=0;
 for(let i=0;i<52;i++){
  base=i%16===0?1:(base+(1<<previous))&65535;
  let bits=0;for(let j=0;j<4;j++){const q=i*4+j;bits=(bits<<1)|((data[q>>3]>>(q&7))&1);}
  assert.equal(m[0x104+i],bits,`bit count ${i}`);assert.equal(m[0x138+i]|m[0x16c+i]<<8,base,`base ${i}`);previous=bits;
 }
}
console.log('OK - 52 unpack header entries for uniform and varied bit streams');
