'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
function run(a,pc,acc=0){a.set([0xa2,2,0xa9,acc,0x20,pc&255,pc>>8,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:100});assert.equal(cpu.pc,0x2f7);return cpu;}
for(const [slot,count,next,release] of [[0,0,255,1],[0,3,2,1],[4,3,3,0]]){const a=base.slice();a[0x1a2b]=slot;a[0x5243]=count;a[0x300]=0;a.set([0xee,0,3,0x60],0x4454);run(a,0x3e54);assert.equal(a[0x5243],next);assert.equal(a[0x300],release);}
for(const [state,carry,next,amount,which] of [[254,0,255,2,1],[128,1,129,128,1],[4,0,5,4,2],[4,1,255,4,2],[127,0,128,127,2]]){const a=base.slice();a[0x1af7]=state;a.fill(0,0x300,0x302);a.set([0x8d,0,3,0xa9,1,0x8d,1,3,0x60],0x4342);a.set([0x8d,0,3,0xa9,2,0x8d,1,3,carry?0x38:0x18,0x60],0x44de);run(a,0x3e60);assert.equal(a[0x1af7],next);assert.deepStrictEqual([...a.slice(0x300,0x302)],[amount,which]);}
for(const [count,next,carry] of [[0,0,1],[1,0,0],[2,1,0]]){const a=base.slice();a[0x1b2a]=count;const cpu=run(a,0x3e88);assert.equal(a[0x1b2a],next);assert.equal(cpu.c,carry);}
for(const [direction,carry,next,which] of [[0,0,0,1],[0,1,128,1],[128,0,128,2],[128,1,0,2]]){const a=base.slice();a[0x1b08]=direction;a.fill(0,0x300,0x302);const flag=carry?0x38:0x18;a.set([0x8d,0,3,0xa9,1,0x8d,1,3,flag,0x60],0x4574);a.set([0x8d,0,3,0xa9,2,0x8d,1,3,flag,0x60],0x45bc);run(a,0x3e94,4);assert.equal(a[0x1b08],next);assert.deepStrictEqual([...a.slice(0x300,0x302)],[4,which]);}
for(const [facing,next,which] of [[0,128,2],[14,0,1]]){const a=base.slice();a[0x1177]=facing;a.fill(0,0x300,0x302);a.set([0x8d,0,3,0x60],0x4342);a.set([0xa9,1,0x8d,1,3,0x60],0x43f0);a.set([0xa9,2,0x8d,1,3,0x60],0x43a2);run(a,0x3ea8);assert.equal(a[0x1b08],next);assert.deepStrictEqual([...a.slice(0x300,0x302)],[8,which]);}
console.log('OK - resident entity motion helpers');
