'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[8,0x9986],[9,0xbc87],[27,0xb021]]){
 const m=base.slice(),file=path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json');
 for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7f04]|m[0x7f34]<<8,d);
 for(const [timer,slot,phase,negative] of [[2,1,0,0],[2,1,15,1],[3,1,2,0],[2,0,2,0],[0,1,2,0]]){
  const a=m.slice();a[0x1b29]=timer;a[0x1a2a]=slot;a[0x1b18]=phase;a[0x1ab2]=0;a[0x1ac3]=77;a[0x19e6]=10;a[d+0x9e]=0x60;a.set([0xa9,negative?0x80:0,0x60],0x3020);a[0x35c1]=0x60;a.set([0x20,0xf0,0x02,0xea],0x02e0);a.set([0x20,(d+0x16)&255,(d+0x16)>>8,0xea,0x60],0x02f0);
  const target=timer===0?0x02e3:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02e0;cpu.run({until:target,maxSteps:80});assert.equal(cpu.pc,target);assert.equal(a[0x1b29],(timer-1)&255);assert.equal(a[0x1ab2],timer===0?1:0);assert.equal(a[0x1ac3],timer===0?0:77);if(timer&&slot)assert.equal(a[0x1b18],(phase+(((timer-1)&1)?(negative?1:-1):0))&15);
 }
 {const a=m.slice();a[0x1b29]=0x7f;a[0x1a2a]=1;a[0x4dae]=0xa4;a[0x49]=0xe5;a[0x4c50]=1;a[0x4c70]=0x64;a[0x4cd0]=0x98;a[d+0x9e]=0x60;a.set([0xa9,0xb7,0x60],0x34ea);a[0x35c1]=0x60;a.set([0x20,(d+0x16)&255,(d+0x16)>>8,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});assert.equal(cpu.pc,0x02f3);assert.deepEqual([...a.slice(0x35bd,0x35c1)],[0xa4,0x72,0xb2,0x4c]);assert.equal(a[0x1b18],0x27);}
 for(const [hit,carry] of [[0,0],[1,0],[0,1],[1,1]]){
  const a=m.slice();a[0x1b29]=2;a[0x1a2a]=1;a[0x1ab2]=0;a[0x1ac3]=77;a[0x19e6]=254;a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x1179);a.set([carry?0x38:0x18,0x60],0x7227);a.set([0x85,0x10,0x60],0x5d7a);a.set([0x20,(d+0x16)&255,(d+0x16)>>8,0xea],0x02f0);
  const transition=hit||carry,target=transition?0x02f3:d+0x27,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.equal(a[0x1b29],1);assert.equal(a[0x1ac3],transition?0:77);assert.equal(a[0x19e6],transition?0:254);assert.equal(a[0x1ab2],transition?1:0);assert.equal(a[0x10],!hit&&carry?8:0);
 }
 for(const [timer,pos] of [[0,250],[1,250],[2,100],[128,100]]){
  const a=m.slice();a[0x1ac3]=timer;a[0x1ad4]=3;a[0x1b2b]=9;a[0x19e6]=pos;a[0x19c4]=77;const cpu=new CPU(a),target=timer===2?0x4454:d+0x8e;cpu.x=1;cpu.pc=d+0x7c;cpu.run({until:target,maxSteps:40});
  assert.equal(cpu.pc,target);assert.equal(a[0x1ac3],timer===2?timer:(timer+1)&255);assert.equal(a[0x19c4],timer===2?77:(pos+((timer<<1)&255))&255);assert.equal(a[0x1b2b],timer===2?8:9);if(timer===2){assert.equal(a[d+0x9a],1);assert.equal(cpu.x,1);}
 }
 for(const [state,offset] of [0x16,0x7c].entries()){
  const a=m.slice(),target=d+offset;a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:20});
  assert.equal(cpu.pc,target);assert.equal(a[d+16]|a[d+17]<<8,target);
 }
}
console.log('OK - type-$25 vectors, two captured targets and both state paths in loads 8, 9 and 27');
