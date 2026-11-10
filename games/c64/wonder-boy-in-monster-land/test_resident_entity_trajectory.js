'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [state7,state8,slot,calls,move] of [[1,0,3,[1,0,0],0],[0,0x56,3,[0,1,1],0x56],[0,0,0,[0,0,0],0],[0,0,3,[0,1,0],0xc3]]){
 const a=base.slice();a[0x1b19]=state7;a[0x1b2a]=state8;a[0x1ac4]=21;a[0x1ad5]=22;a[0x1a2b]=slot;a[0x4cd2]=150;a[0x4c52]=1;a[0x4c72]=100;a.fill(0,0x300,0x304);a.set([0xee,0,3,0x60],0x3e5a);a.set([0xee,2,3,0x60],0x3e54);a.set([0xee,1,3,0x8d,3,3,0x60],0x35c1);a.set([0xa9,3,0x60],0x34ea);a.set([0xa2,2,0x20,0xb9,0x3d,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:120});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([...a.slice(0x300,0x304)],[...calls,move]);if(!state7&&!state8){assert.deepStrictEqual([...a.slice(0x35bd,0x35bf)],[21,22]);if(slot){assert.deepStrictEqual([...a.slice(0x35bf,0x35c1)],[178,75]);assert.equal(a[0x1b2a],0xc3);}}
}
console.log('OK - resident entity trajectory selection');
