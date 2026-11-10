'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);
for(const part of ['resident','stage-11'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
assert.equal(m[0x7eef]|m[0x7f1f]<<8,0x9fab);
for(const [state,face,timer,pos] of [[0,0,0,250],[0,1,0,250],[1,0,4,1],[1,1,255,1]]){
 const a=m.slice();a[0x1ab2]=state;a[0x1ae5]=timer;a[0x19e6]=pos;a.set([face?0x38:0x18,0x60],0x72fc);const target=state?0xa042:0x9fc4,cpu=new CPU(a);cpu.x=1;cpu.pc=0x9fab;cpu.run({until:target,maxSteps:60});const v=(pos+(face?6:0))&255,after=(timer-1)&255;assert.equal(cpu.pc,target);assert.equal(a[0x9fbe]|a[0x9fbf]<<8,target);assert.equal(a[0x1ae5],after);assert.equal(a[0x19c4],v);assert.equal(a[0x19d5],(v+2+((after&4)>>1))&255);
}
for(const timer of [0,1,2,255]){const a=m.slice();a[0x1b29]=timer;a.set([0x85,0x10,0x60],0x4b20);a.set([0x20,0x42,0xa0,0xea],0x02f0);const after=(timer-1)&255,target=after===0?0x5db9:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target);assert.equal(a[0x1b29],after);assert.equal(a[0x10],after===0?3:0);if(after===0)assert.equal(cpu.a,1);}
for(const [i,j] of [[0,0],[0x49,0x21],[0x48,0x20],[0x20,0x10]]){
 const a=m.slice();a[0x1ac3]=i;a[0x1ad4]=j;a[0x1a90]=1;a.set([0x85,0x10,0x60],0x43a2);a.set([0x85,0x11,0x60],0x43f0);a.set([0x85,0x12,0x60],0x4342);a.set([0x85,0x13,0x60],0x4368);a.set([0x20,0xc4,0x9f,0xea],0x02f0);const v=a[0xa052+i],w=a[0xa09c+j],cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:80});const first=v&128?(-v)&255:v,second=w&128?(-w)&255:w;assert.equal(cpu.pc,0x02f3);assert.deepEqual([a[0x10],a[0x11],a[0x12],a[0x13]],[v&128?first:0,v&128?0:first,w&128?second:0,w&128?0:second]);assert.equal(a[0x1ac3],i===0x49?0:(i+1)&255);assert.equal(a[0x1ad4],j===0x21?0:(j+1)&255);
}
for(const [hit,value,follow] of [[0,1,0],[0,1,1],[1,1,0],[1,0,0],[1,128,0]]){
 const a=m.slice();a[0x1ac3]=0;a[0x1ad4]=0;a[0x1a90]=0;a[0x1a6e]=value;a[0x1ab2]=0;a[0x1b29]=55;for(const z of [0x43a2,0x43f0,0x4342,0x4368,0x792c])a[z]=0x60;a.set([hit?0x38:0x18,0x60],0x732a);a.set([follow?0x38:0x18,0x60],0x7227);a.set([0x85,0x10,0x60],0x5d7a);a.set([0x20,0xc4,0x9f,0xea],0x02f0);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});const change=hit&&(value===0||(value&128));assert.equal(cpu.pc,0x02f3);assert.equal(a[0x1ab2],change?1:0);assert.equal(a[0x1b29],change?16:55);assert.equal(a[0x1a90],change?255:0);assert.equal(a[0x10],!hit&&follow?8:0);
}
console.log('OK - type-$10 dispatcher, position, movement tables and event paths');
