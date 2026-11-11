'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,base=new Uint8Array(65536);
for(const p of ['resident','stage-19'])for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
{const m=base.slice();m[0xbe95]=2;m[0x1ab3]=4;m.set([0x86,0x10,0x84,0x11,0x60],0x77e0);const cpu=new CPU(m);cpu.call(0xbe38,{}, {maxSteps:60});assert.equal(m[0x10]|m[0x11]<<8,0xbe27);assert.equal(m[0x1ab3],5);for(const [a,v] of [[0x1b28,30],[0x1b17,1],[0x1b06,0],[0x1af5,0],[0x1ae4,0],[0x1ad3,0],[0x1ac2,0]])assert.equal(m[a+2],v);}
for(const [mode,lo,hi] of [[255,0x87,0x8c],[0,0x8d,0x93],[1,0x94,0x9a]]){const m=base.slice();m[0xbe8e]=mode;m[0x3c2a]=m[0x370b]=0x60;const cpu=new CPU(m);cpu.call(0xbe61,{}, {maxSteps:300});for(let y=0x87;y<=0x9a;y++)assert.equal(m[0xd800+y],y>=lo&&y<=hi?1:3);assert.equal(m[0xbe86],hi);}
console.log('OK - load-19 message entity and three cursor colour ranges');
