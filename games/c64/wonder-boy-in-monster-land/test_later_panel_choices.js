'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,start] of [[4,0xa48f],[9,0x9fbb],[19,0xa278],[20,0x9d75],[30,0xaf7c]])for(const [moneyHi,moneyLo,meter,max,flag,targetOffset,messageOffset,field] of [[0,0x10,5,8,0,0x130,0x1c9,4],[0x10,0,5,5,0,0x130,0x1b5,4],[0x10,0,5,8,0,0xa4,0x15d,5],[0x10,0,5,8,2,0xa4,0x148,7]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);m[0x46]=0xc0;m[0x7b]=0;m[0x4dbd]=0;m[0x4dc7]=moneyHi;m[0x4dc9]=moneyLo;m[0x4dcd]=meter;m[0x4dcf]=max;m[0x4753]=5|flag;m[start+0x1ea]=0x12;
 const cpu=new CPU(m);cpu.pc=start;cpu.p&=~8;cpu.run({until:start+targetOffset,maxSteps:300});assert.equal(cpu.pc,start+targetOffset);assert.equal(cpu.x|cpu.y<<8,start+messageOffset);assert.equal(m[0x4753],field);
}
console.log('OK - five later-load panel balance and message choices');
