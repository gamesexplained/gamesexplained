'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
assert.equal(base[0x7f0e]|base[0x7f3e]<<8,0xa05f);
for(const [timer,state,hit,follow] of [[0,0,0,0],[2,2,0,1],[255,18,1,0],[128,30,0,0]]){
 const a=base.slice();a[0x1a2b]=20;a[0x4c63]=1;a[0x4c83]=100;a[0x4ce3]=70;a[0x1b2a]=timer;a[0x1ab3]=state;a[0x195f]=250;a[0x1970]=1;a[0x19a3]=50;a.set([hit?0x38:0x18,0x60],0x1179);a.set([follow?0x38:0x18,0x60],0x7227);a.set([0x85,0x10,0x60],0x5d7a);const index=0x80|((state>>1)&15),dx=a[0x56a8+index],dy=a[0x5778+index];a.set([0x20,0x5f,0xa0,0xea],0x02f0);const cpu=new CPU(a);cpu.x=2;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});const coord=(0x1fa+(timer<128?timer:timer-256)+(dx<128?dx:dx-256))&65535;assert.equal(cpu.pc,0x02f3);assert.deepEqual([...a.slice(0x762e,0x7632)],[0xb6,82,4,10]);assert.equal(a[0x195f],coord&255);assert.equal(a[0x1970],coord>>8);assert.equal(a[0x19a3],(50-dy)&255);assert.equal(a[0x1b2a],0);assert.equal(a[0x1ab3],(state+1)&255);assert.equal(a[0xa0e5],dx&128?255:0);assert.equal(a[0x10],!hit&&follow?4:0);
}
console.log('OK - load-24 type-$2F signed motion and contact setup');
