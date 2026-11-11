'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const kind of ['move','negative','reset','collision_left','collision_right','collision_zero','contact','blocked']){
 const a=base.slice();a[0x1a2a]=['move','negative','reset','blocked'].includes(kind)?0:3;a[0x1a6e]=kind==='collision_zero'?0:1;a[0x1ab2]=0;a[0x1ac3]=0;a[0x1ad4]=0;a[0x1ae5]=kind==='negative'?0:kind==='reset'?0xfb:1;a[0x19e6]=0x40;a.fill(0,0x400,0x403);a[0x792c]=0x60;a.set([kind.startsWith('collision')?0x38:0x18,0x60],0x732a);a.set([kind==='collision_right'?0x38:0x18,0x60],0x72fc);a.set([kind==='contact'?0x38:0x18,0x60],0x7227);a.set([0x8d,2,4,0x60],0x5d7a);const value=kind==='blocked'?0:2;a.set([0xee,0,4,0xa9,value,0x60],0x45bc);a.set([0xee,1,4,0xa9,value,0x60],0x4574);a.set([0xa2,1,0x20,0x4b,0xb2,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:160});assert.equal(cpu.pc,0x2f5);
 if(kind.startsWith('collision'))assert.deepStrictEqual([a[0x1ab2],a[0x1ad4],a[0x1ae5]],kind==='collision_zero'?[2,0,10]:[1,kind==='collision_right'?0:128,8]);else assert.deepStrictEqual([0x1ad4,0x1ac3,0x1ae5,0x19c4,0x400,0x401,0x402].map(address=>a[address]),{move:[0,0,0,0x48,0,1,0],negative:[0,0,255,0x4a,0,0,0],reset:[128,128,20,0x42,0,0,0],contact:[128,0,0,0x40,1,0,8],blocked:[128,0,0,0x40,0,1,0]}[kind]);
}
console.log('OK - first-load second entity normal state');
