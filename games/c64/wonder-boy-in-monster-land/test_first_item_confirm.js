'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [layout,index,field,enough,target,msg,id] of [[1,255,0,true,0xa52e,0,0],[0,0,128,true,0xa78b,0xa8b4,0],[0,0,0,true,0xa78b,0xa8b4,0],[0,0,2,true,0xa78b,0xa89d,0],[0,255,4,false,0xa68b,0,3],[0,1,4,true,0xa78b,0xa879,8],[0,255,4,true,0xa78b,0xa879,3]]){
 const m=base.slice();m[0xa84a]=layout;m[0xa84b]=index;m[0x7b]=0;m[0x4753]=field;m[0xa850]=3;m[0xa851]=8;m[0x10]=0;
 for(const item of [3,8]){const a=0xaba1+item*8;m[a]=0x12;m[a+1]=0x34;m[a+4]=0xe0;m[a+5]=0x02;}
 m.set([enough?0x38:0x18,0x60],0x7901);m.set([0x85,0x10,0x60],0x02e0);
 const cpu=new CPU(m);cpu.pc=0xa712;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);
 if(msg)assert.equal(cpu.x|cpu.y<<8,msg);
 if(id){assert.equal(m[0x7d],0x12);assert.equal(m[0x7e],0x34);assert.equal(m[0x4753],enough?field-1:field);assert.equal(m[0x10],enough?id+1:0);}
}
console.log('OK - first-load item confirmation with payment and effect callbacks stubbed');
