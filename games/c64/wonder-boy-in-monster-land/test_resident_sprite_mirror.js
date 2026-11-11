'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const a=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)a.set(r.b,r.a);
const first=Array.from({length:63},(_,i)=>(i*37+19)&255),second=Array.from({length:63},(_,i)=>(i*71+13)&255);a.set(first,0xc800);a.set(second,0xc840);a[0xca3f]=0xa5;a[0xca7f]=0x5a;a.set([0xa2,0x20,0xa0,0x28,0x20,0x86,0x20,0x8e,0,3,0x8c,1,3,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2fe,maxSteps:10000});assert.equal(cpu.pc,0x2fe);
function mirror(v,group){let out=0;for(let i=0;i<8/group;i++)out|=((v>>(group*i))&((1<<group)-1))<<(group*(8/group-1-i));return out;}
for(const [src,dst,group] of [[first,0xca00,1],[second,0xca40,2]]){const expected=Array.from({length:63},(_,i)=>mirror(src[3*Math.floor(i/3)+2-i%3],group));assert.deepStrictEqual([...a.slice(dst,dst+63)],expected);}
assert.equal(a[0xca3f],0xa5);assert.equal(a[0xca7f],0x5a);assert.deepStrictEqual([...a.slice(0x300,0x302)],[0x22,0x2a]);console.log('OK - resident sprite mirroring');
