'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,state7,carry,phase] of [[0x3d69,0,0,0],[0x3d7f,1,0,0],[0x3d7f,0,1,0],[0x3d7f,0,0,0],[0x3d9f,0,0,0],[0x3d9f,0,0,1]]){
 const a=base.slice();a[0x1ab3]=3;a[0x1ac4]=phase;a[0x1b19]=state7;a.fill(0,0x300,0x306);for(const [address,index] of [[0x3ea8,0],[0x3e60,1],[0x3e94,2],[0x3e54,3],[0x3e5a,4]])a.set([0xee,index,3,0x60],address);a.set([0xee,5,3,carry?0x38:0x18,0x60],0x3e88);a.set([0xa2,2,0x20,pc&255,pc>>8,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:100});assert.equal(cpu.pc,0x2f5);const calls=[...a.slice(0x300,0x306)];
 if(pc===0x3d69){assert.deepStrictEqual(calls,[1,0,0,0,0,0]);assert.deepStrictEqual([a[0x1af7],a[0x1b19],a[0x1b2a],a[0x1ab3]],[252,0,50,4]);}
 else if(pc===0x3d7f){assert.deepStrictEqual(calls,state7?[0,0,0,0,0,0]:[0,1,1,carry?0:1,0,1]);if(state7||carry)assert.deepStrictEqual([a[0x1ab3],a[0x1ac4],a[0x19c5]],[4,1,0xa9]);}
 else if(!phase)assert.deepStrictEqual(calls,[0,0,0,0,1,0]);else{assert.deepStrictEqual(calls,[0,0,0,0,0,0]);assert.equal(a[0x1ac4],0);assert.equal(a[0x19c5],0xa7);}
}
console.log('OK - resident first entity motion and animation');
