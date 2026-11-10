'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [state,life,aux,nextState,nextLife,frame,effect,move,release] of [[0,1,0,1,0,0x40,0,6,0],[5,33,0,6,32,0x40,0,1,0],[6,34,0,7,33,0x40,0,0,0],[6,33,0,7,32,0x40,255,0,0],[6,1,0,7,0,0x40,0,0,1],[7,33,1,7,32,0x40,255,0,0],[7,1,0,7,0,0x40,0,0,1],[7,0,1,7,255,0x40,0,0,0]]){
 const a=base.slice();a[0x1ac4]=state;a[0x1af7]=life;a[0x1a80]=aux;a[0x19e7]=0x40;a[0x19c5]=0x55;a[0x1a91]=0;a.fill(0,0x300,0x302);a.set([0x8d,0,3,0x60],0x4342);a.set([0xee,1,3,0x60],0x4454);a.set([0xa2,2,0x20,0x3f,0x60,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:100});assert.equal(cpu.pc,0x2f5);assert.equal(a[0x1ac4],nextState);assert.equal(a[0x1af7],nextLife);assert.equal(a[0x19c5],frame);assert.equal(a[0x1a91],effect);assert.deepStrictEqual([...a.slice(0x300,0x302)],[move,release]);if(state===6)assert.equal(a[0x1a80],1);
}
for(const frame of [0,77,255]){
 const a=base.slice();a[0x7f6b]=frame;a.fill(0,0x300,0x302);a[0x447a]=0x60;a.set([0x8d,0,3,0x8e,1,3,0x60],0x4342);a.set([0xa2,2,0x20,0xe2,0x5f,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:80});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([...a.slice(0x300,0x302)],[12,2]);for(const [address,value] of [[0x191b,0xf9],[0x19e7,frame],[0x19c5,frame],[0x19f8,7],[0x1a09,0],[0x1aa2,7]])assert.equal(a[address],value);
}
console.log('OK - resident type-F9 initialization and animation');
