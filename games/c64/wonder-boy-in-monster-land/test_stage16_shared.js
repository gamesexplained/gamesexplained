'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536),slot=1;for(const part of ['resident','stage-16'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
function run({index=0,display=1,param=0,collision=true,overlap=false}={}){
 const m=base.slice();m[0x1ac2+slot]=index;m[0x19e5+slot]=0x70;m[0x1ad3+slot]=8;m[0x1a29+slot]=display;m[0x1a6d+slot]=param;m[0x19f6+slot]=7;m[0x1ab1+slot]=3;m[0x2e0]=m[0x2e1]=0;
 m.set([collision?0x38:0x18,0x60],0x732a);m.set([overlap?0x38:0x18,0x60],0x7227);m.set([0x8d,0xe1,0x02,0x60],0x5d7a);m[0x8fff]=0x60;
 m.set([0x20,0x9c,0x90,0xa9,0x42,0x8d,0xe0,0x02,0x60],0x0300);new CPU(m).call(0x0300,{x:slot});return m;
}
let m=run({index:7,display:0});assert.equal(m[0x1ac3],0);assert.equal(m[0x19c4],0x78);assert.equal(m[0x2e0],0x42);
m=run({index:1,display:0});assert.equal(m[0x1ac3],2);assert.equal(m[0x19c4],0x7a);
m=run({param:1});assert.equal(m[0x1ab2],5);assert.equal(m[0x1ac3],7);assert.equal(m[0x2e0],0);
for(const param of [0,0xff]){m=run({param});assert.equal(m[0x1ab2],6);assert.equal(m[0x1ac3],10);assert.equal(m[0x2e0],0)}
m=run({collision:false,overlap:false});assert.equal(m[0x2e0],0x42);assert.equal(m[0x2e1],0);
m=run({collision:false,overlap:true});assert.equal(m[0x2e0],0x42);assert.equal(m[0x2e1],2);
console.log('OK - stage 16 shared frame update, collision paths and stacked-return handling');
