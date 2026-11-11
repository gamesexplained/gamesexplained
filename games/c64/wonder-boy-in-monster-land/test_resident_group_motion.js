'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const cases=[[0,0,0,0,0,0,0,0,0,0,0,0],[0x40,0,0,0,100,5,0x9f,0x3f,1,90,0,8],[10,0,10,2,100,5,0x97,9,0x8a,100,5,1],[10,0,0x8a,2,190,3,0x97,9,0x8a,193,4,1],[10,0,0x8a,2,191,3,0x97,9,11,194,4,1],[10,0,0x99,2,194,0,0x97,9,25,194,1,1],[10,128,0,2,100,3,0x97,9,0,100,3,2]];
for(const [life,mode,phase,delay,y,speed,frame,nextLife,nextPhase,nextY,nextSpeed,nextDelay] of cases){
 const a=base.slice();a[0x4d53]=life;a[0x4d54]=delay;a[0x4d51]=mode;a[0x4d52]=phase;a[0x4d39]=y;a[0x4d3a]=frame;a[0x402d]=speed;a[0x4d69]=0;a.fill(0,0x4d21,0x4d29);a[0x300]=0;a.set([0xee,0,3,0x60],0x402f);a.set([0x20,0x76,0x3f,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:300});assert.equal(cpu.pc,0x2f3);
 if(!life)assert.deepStrictEqual([...a.slice(0x4d21,0x4d29)],Array(8).fill(1));else{assert.deepStrictEqual([a[0x4d53],a[0x4d52],a[0x4d39],a[0x402d],a[0x4d54]],[nextLife,nextPhase,nextY,nextSpeed,nextDelay]);assert.equal(a[0x300],mode?1:0);if(!delay&&!mode)assert.equal(a[0x4d3a],0x99);}
}
for(const [phase,y,nextY,frame,nextPhase,land] of [[0,100,90,0xa1,1,false],[10,100,100,0xa3,11,false],[18,100,108,0xa3,18,false],[0,210,194,0xa5,0xa5,true],[128,100,100,0x55,128,false],[128,200,194,0xa5,0xa5,true]]){
 const a=base.slice();a[0x4d52]=phase;a[0x4d39]=y;a[0x4d3a]=0x55;a[0x4d69]=0;a.set([1,2,3,4,5,6,7,8],0x4d3b);a[0x40f7]=8;a.set([0x20,0x2f,0x40,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:100});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([a[0x4d39],a[0x4d3a],a[0x4d52]],[nextY,frame,nextPhase]);assert.deepStrictEqual([...a.slice(0x4d3b,0x4d43)],land?Array(8).fill(0):[1,2,3,4,5,6,7,8]);
}
console.log('OK - resident effect-group motion');
