'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[10,0x9fe3],[28,0xa7b6],[29,0xa3c7]]){
 const m=base.slice(),file=path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json');
 for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7eee]|m[0x7f1e]<<8,d);
 { const a=m.slice();a[0x1a90]=1;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:d+7,maxSteps:10});assert.equal(cpu.pc,d+7); }
 for(const effect of [0,0xff])for(const state of [0,1,2,3,4,5,255]){
  const a=m.slice(),target=d+[0x24,0x3d,0xb2,0x104,0x10a][Math.min(state,4)];
  a[0x1a90]=effect;a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:40});
  assert.equal(cpu.pc,target);assert.equal(a[d+24]|a[d+25]<<8,target);
 }
 for(const [timer,state] of [[0,0],[18,0],[19,0],[255,0],[7,3]]){
  const a=m.slice();a[0x1b29]=timer;a[0x1ab2]=state;a[d+0x12a]=0x60;a[d+0xd1]=0x60;
  const cpu=new CPU(a);cpu.x=1;cpu.pc=d+(state===0?0x24:0x104);const end=d+(state===0?0x3c:0x109);cpu.run({until:end,maxSteps:40});
  const next=(timer+1)&255;assert.equal(a[0x1b29],state===0?(next===20?7:next):timer);assert.equal(a[0x1ab2],state===0&&timer===19?1:0);
 }
}
console.log('OK - type-$0F vectors, signed effect gate and clamped state targets in loads 10, 28 and 29');
