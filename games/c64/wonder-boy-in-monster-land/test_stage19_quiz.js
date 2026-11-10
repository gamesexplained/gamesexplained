'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);
for(const p of ['resident','stage-19'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
{
 const m=base.slice();m[0x4d6b]=0;m.fill(0,0x10,0x14);m.set([0x86,0x10,0x84,0x11,0x60],0x77e0);m.set([0xe6,0x12,0x60],0x370b);m.set([0xe6,0x13,0x60],0xbe61);const cpu=new CPU(m);cpu.pc=0xbd50;cpu.run({until:0xbdb8,maxSteps:80});assert.equal(cpu.pc,0xbdb8);assert.equal(m[0x10]|m[0x11]<<8,0xbd20);assert.equal(m[0x12],2);assert.equal(m[0x13],1);assert.equal(m[0xbe8e],255);
}
for(const [mode,left,right,fire,target,want] of [[255,0,1,1,0xbd9a,255],[0,0,1,1,0xbd9a,255],[1,1,0,1,0xbd9a,1],[0,1,0,1,0xbd9a,1],[0,1,1,0,0xbdb8,0]]){const m=base.slice();m[0xbe8e]=mode;m[0x73]=left;m[0x74]=right;m[0x70]=fire;m[0x3c4c]=0x60;const cpu=new CPU(m);cpu.pc=0xbd6d;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target);assert.equal(m[0xbe8e],want);}
for(const [mode,answer,success] of [[255,0,false],[0,0,true],[1,1,true],[0,1,false],[1,0,false]]){const m=base.slice();m[0xbe8e]=mode;m[0x9a4b]=answer;m[0x77e0]=0x60;const cpu=new CPU(m);cpu.pc=0xbdb8;cpu.p&=~1;const target=success?0xbde0:0xbe38;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.equal(m[0xbdd6],answer&1);if(mode!==255)assert.equal(m[0x9a4b],0);if(success)assert.equal(cpu.x|cpu.y<<8,0xbded);}
for(const [left,right,fire,held] of [[1,1,1,false],[0,1,1,true],[1,0,1,true],[1,1,0,true]]){const m=base.slice();m[0x73]=left;m[0x74]=right;m[0x70]=fire;m[0x3c4c]=0x60;const cpu=new CPU(m);cpu.call(0xbda5,{}, {maxSteps:30});assert.equal(Boolean(cpu.p&1),held);}
{const m=base.slice();m[0xbe95]=2;m.set([0x85,0x10,0x60],0x4b20);const cpu=new CPU(m);cpu.pc=0xbde0;cpu.run({until:0x5db9,maxSteps:20});assert.equal(cpu.pc,0x5db9);assert.equal(m[0x10],4);assert.equal(cpu.a,3);assert.equal(cpu.x,2);}
console.log('OK - load-19 quiz selection and answer branches with callbacks stubbed');
