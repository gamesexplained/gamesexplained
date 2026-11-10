'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const kind of ['no_slot','collision_left','collision_right','collision_zero','neg5','neg6','pos5','pos6','wave_wrap','wave_down']){
 const a=base.slice();a[0x1a2a]=kind==='no_slot'?0:3;a[0x1a6e]=kind==='collision_zero'?0:1;a[0x1ab2]=0;a[0x1ac3]=0;a[0x1ad4]=kind==='neg5'?251:['neg6','wave_wrap','wave_down'].includes(kind)?250:kind==='pos5'?5:6;a[0x1ae5]=kind==='wave_wrap'?39:kind==='wave_down'?4:0;a[0x1b29]=1;a[0x19e6]=0x40;a.fill(0,0x400,0x406);a[0x792c]=0x60;a.set([kind.startsWith('collision')?0x38:0x18,0x60],0x732a);a.set([['collision_right','neg5','neg6','wave_wrap','wave_down'].includes(kind)?0x38:0x18,0x60],0x72fc);a.set([0x18,0x60],0x7227);a.set([0x8d,0,4,0xee,2,4,0x60],0x43f0);a.set([0x8d,1,4,0xee,3,4,0x60],0x43a2);a.set([0x8d,4,4,0x60],0x4342);a.set([0x8d,5,4,0x60],0x4368);a.set([0xa2,1,0x20,0x89,0xb3,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:200});assert.equal(cpu.pc,0x2f5);
 if(kind==='no_slot')assert.equal(a[0x1ab2],0);else if(kind.startsWith('collision'))assert.deepStrictEqual([a[0x1ab2],a[0x1ac3]],kind==='collision_zero'?[2,0]:[1,kind==='collision_right'?1:255]);else{assert.deepStrictEqual([...a.slice(0x400,0x406)],{neg5:[0,0,0,0,3,0],neg6:[0,0,1,0,3,0],pos5:[0,0,0,1,3,0],pos6:[0,1,0,1,3,0],wave_wrap:[0,0,1,0,4,0],wave_down:[0,0,1,0,0,1]}[kind]);assert.equal(a[0x1ae5],kind==='wave_wrap'?0:kind==='wave_down'?5:1);}
}
console.log('OK - first-load third entity normal state');
