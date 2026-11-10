'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [left,right,fire,held] of [[1,1,1,false],[0,1,1,true],[1,0,1,true],[1,1,0,true],[0,0,0,true]]){const m=base.slice();m[0x73]=left;m[0x74]=right;m[0x70]=fire;m[0x3c4c]=0x60;const cpu=new CPU(m);cpu.call(0xa7af,{}, {maxSteps:30});assert.equal(Boolean(cpu.p&1),held);}
for(const [index,pos] of [[255,0x12],[0,0x34],[1,0x56]]){const m=base.slice();m[0xa84b]=index;m.set([0x12,0x34,0x56],0xa84c);const cpu=new CPU(m);cpu.pc=0xa7c2;cpu.p&=~8;cpu.run({until:0x719e,maxSteps:20});assert.equal(cpu.pc,0x719e);assert.equal(cpu.x,pos);assert.equal(cpu.y,0x82);}
console.log('OK - first-load item input held and cursor position');
