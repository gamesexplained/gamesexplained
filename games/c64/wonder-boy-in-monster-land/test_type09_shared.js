'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const entries=[[5,0x9424],[7,0x9a7f],[13,0x9541],[21,0x952e],[22,0xa094],[24,0x9bfb]];
for(const [load,dispatch] of entries){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [delay,timer,phase,sprite,expectedFrame,expectedTimer,carry] of [[2,1,0x80,0x70,0x55,1,0],[1,1,0x80,0x70,0x76,0,0],[1,0,0x80,0x70,0x74,6,1],[1,0,0,0x70,0x7c,6,1],[1,0,0,0xf4,0x55,0,1]]){
  const run=m.slice();run[0x1b29]=delay;run[0x1b18]=timer;run[0x1af6]=phase;run[0x19e6]=sprite;run[0x19c4]=0x55;const cpu=new CPU(run);cpu.call(dispatch+0x190,{x:1},{maxSteps:1000});
  assert.equal(run[0x1b29],(delay-1)&255);assert.equal(run[0x19c4],expectedFrame);assert.equal(run[0x1b18],expectedTimer);assert.equal(cpu.c,carry);
 }
}
console.log('OK - six shared type-9 animation routines, timer wrap and zero-result carry edge');
