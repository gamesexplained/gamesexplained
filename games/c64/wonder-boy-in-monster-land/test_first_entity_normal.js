'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const kind of ['no_slot','collision_positive','collision_zero','move_left','move_right','wrap']){
 const a=base.slice();a[0x1a2a]=kind==='no_slot'?0:3;a[0x1a7f]=0;a[0x1a6e]=kind==='collision_zero'?0:1;a[0x1ab2]=0;a[0x1ad4]=['move_left','wrap'].includes(kind)?0:2;a[0x1ae5]=4;a[0x19e6]=kind==='wrap'?250:0x40;a[0x400]=0;a[0x792c]=0x60;a.set([kind.startsWith('collision')?0x38:0x18,0x60],0x732a);a.set([['move_left','wrap'].includes(kind)?0x38:0x18,0x60],0x7227);a.set([kind==='move_right'?0x38:0x18,0x60],0x72fc);a.set([0xee,0,4,0x60],0x5d7a);a.set([0xa2,1,0x20,0x88,0xb1,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:120});assert.equal(cpu.pc,0x2f5);
 if(kind==='no_slot')assert.equal(a[0x1a7f],1);else if(kind==='collision_positive')assert.equal(a[0x1ab2],1);else if(kind==='collision_zero'){assert.equal(a[0x1ab2],2);assert.equal(a[0x1b18],8);}else assert.deepStrictEqual([0x1ad4,0x1ae5,0x1b29,0x19c4,0x1a7f,0x400].map(address=>a[address]),kind==='wrap'?[2,6,8,9,1,1]:kind==='move_left'?[2,6,8,0x4e,1,1]:[1,4,0,0x44,1,0]);
}
console.log('OK - first-load normal entity state');
