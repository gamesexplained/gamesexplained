'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[9,0xbb15],[11,0x9e47],[20,0xbb6b]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [state,timer,carry] of [[2,1,0],[2,2,0],[3,7,0],[3,8,0],[3,7,1]]){
  const m=original.slice();m[0x1ab2]=state;m[0x1ad4]=timer;m.fill(0,0x10,0x13);m[d+0xf9]=0x60;m.set([0xe6,0x10,0x60],0x4342);m.set([0xe6,0x11,carry?0x38:0x18,0x60],0x44de);m.set([0xe6,0x12,0x60],d+0xa5);
  const target=d+(state===2&&timer===1?0x82:state===3&&carry?0x3e:0xe4),cpu=new CPU(m);cpu.x=1;cpu.pc=d+(state===2?0x6b:0x82);cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);
  if(state===2){assert.equal(m[0x1ad4],timer-1);assert.equal(m[0x1ab2],timer===1?3:2);assert.deepEqual([...m.slice(0x10,0x13)],timer===1?[1,0,0]:[1,0,1])}
  else{assert.deepEqual([...m.slice(0x10,0x13)],carry?[0,1,0]:[0,1,1]);assert.equal(m[0x1ab2],carry?1:3);assert.equal(m[0x1ad4],carry||timer===8?timer:timer+1)}
 }
}
console.log('OK - type-$0E states 2 and 3 in loads 9, 11 and 20');
