'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[2,0xbe7e],[4,0xb6a6],[6,0xb912],[14,0xa733],[15,0xaa9c],[17,0xa093],[24,0xa0fa],[25,0xa37d]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [hit,other,sign] of [[0,0,0],[1,0,0],[0,1,0],[1,0,128],[0,1,128]]){const m=original.slice();m[d+0xcb]=sign;m[0x1ac3]=9;m[0x1a08]=0;m[0x19e6]=0xfe;m[0x1ab2]=0;m.fill(0,0x10,0x14);m.set([0xe6,0x10,0x60],0x792c);m.set([0xe6,0x11,hit?0x38:0x18,0x60],0x1179);m.set([other?0x38:0x18,0x60],0x7227);m.set([0x85,0x13,0xe6,0x12,0x60],0x5d7a);new CPU(m).call(d+0xb5,{x:1});assert.deepEqual([...m.slice(0x10,0x14)],!hit&&other?[1,1,1,8]:[1,1,0,0]);
  if(hit||other){const v=(0xfe+(sign&128?0:2)+2)&255;assert.equal(m[0x1ac3],0);assert.equal(m[0x1a08],1);assert.equal(m[0x1ab2],2);assert.equal(m[0x19c4],v)}else assert.equal(m[0x1ab2],0);
 }
}
console.log('OK - type-$22 collision helper in eight loads');
