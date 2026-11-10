'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [y,step,fine,bottom,height,nextY,nextStep,nextFine,nextState,calls] of [[150,4,0,0,8,154,4,0,7,[0,0,0]],[160,4,5,0,8,162,2,3,7,[0,1,0]],[162,3,2,6,8,162,3,7,7,[1,1,1]],[162,3,2,14,7,163,1,0,7,[0,0,0]],[224,2,0,0,8,225,2,0,0,[0,0,0]]]){
 const a=base.slice();a[0x49]=y;a[0x4db4]=step;a[0x4d69]=fine;a[0x569e]=bottom;a[0x7f4c]=height;a[0x4db3]=7;a.fill(0,0x300,0x303);for(const [addr,i] of [[0x2e77,0],[0x0d0a,1],[0x31a9,2]])a.set([0xee,i,3,0x60],addr);a.set([0x20,0xa0,0x0c,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:120});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([a[0x49],a[0x4db4],a[0x4d69],a[0x4db3]],[nextY,nextStep,nextFine,nextState]);assert.deepStrictEqual([...a.slice(0x300,0x303)],calls);
}
{
 const a=base.slice();a[0x49]=162;a[0x4db4]=3;a[0x4d69]=5;a[0x4db8]=0;const values=Array.from({length:28},(_,i)=>i);values[5]=255;a.set(values,0x27);a.set([0x20,0xa0,0x0c,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:500});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x4d69],2);assert.deepStrictEqual([...a.slice(0x27,0x43)],values.map(v=>v===255?v:(v-3)&255));
}
for(const [offset,first,second,state,blocked] of [[15,1,0,0,1],[15,0,2,0,1],[15,0,2,255,0],[15,0,0,0,0],[0,1,2,0,0]]) {
 const a=base.slice();a[0x7a]=1;a[0x527d]=offset;a[0x4db4]=2;a[0x4db3]=state;a[0x4db8]=77;a[0x4db9]=88;a[0x4d55]=55;a[0x49]=150;a[0x6f3c]=0;a[0x6f3d]=0;a[0x85d0]=0;a[0x8621]=0x70;a[0x7000]=1;a[0x7001]=2;a[0x80d0]=first;a[0x80d1]=second;a[0x300]=0;a.set([0xee,0,3,0x60],0x213e);a.set([0x20,0x2c,0x0c,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:500});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x300],1-blocked);assert.equal(a[0x49],blocked?150:152);assert.equal(a[0x4db4],blocked?0:2);assert.equal(a[0x4db3],blocked?0:state);assert.equal(a[0x4db6],blocked?0:255);assert.deepStrictEqual([...a.slice(0x4db8,0x4dba)],blocked?[0,0]:[77,88]);
}
console.log('OK - resident downward player scrolling');
