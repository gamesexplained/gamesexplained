'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const ptr=base[0x7f4f]|base[0x7f50]<<8,limit=base[0x7f51],arrays=[0x1919,0x19e5,0x193b,0x194c,0x197f,0x1990,0x19f6,0x1a18,0x192a,0x1a6d];assert.equal(ptr,0xb4ef);assert.equal(limit,5);assert.equal(base[ptr+60],0);
for(let i=0;i<6;i++){const m=base.slice(),bytes=[...m.slice(ptr+i*10,ptr+i*10+10)];m[0xe2]=ptr&255;m[0xe3]=ptr>>8;const cpu=new CPU(m);cpu.call(0x369e,{x:1,y:i*10},{maxSteps:100});assert.deepEqual(arrays.map(a=>m[a+1]),bytes);assert.equal(cpu.y,(i+1)*10);}
console.log('OK - first-load six entity records match the copy routine');
