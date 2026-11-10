'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [meter,cache] of [[0,255],[1,255],[2,255],[15,255],[39,255],[40,255],[79,255],[15,15]]){
 const a=base.slice();a[0x4dbd]=1;a[0x4dce]=meter;a[0x4da2]=cache;a.fill(0xaa,0xc400,0xc440);a.set([0x44,0x44],0x4c6f);a[0x6e]=0x44;a.set([0xa0,1,0x20,0x86,0x6f,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:1000});assert.equal(cpu.pc,0x2f5);let expected,frame;if(meter===cache){expected=Array(64).fill(0xaa);frame=0x44;}else{expected=Array(64).fill(0);const half=Math.floor((meter+1)/2);frame=(meter+1)&1?0x21:0x20;function segment(n,start){while(n>=8){for(let row=0;row<8;row++)expected[start+row*3]=255;n-=8;start++;}for(let row=0;row<8;row++)expected[start+row*3]=(255<<(8-n))&255;}if(half>=20){segment(20,0);segment(half-20,24);}else segment(half,0);}assert.deepStrictEqual([...a.slice(0xc400,0xc440)],expected);assert.deepStrictEqual([a[0x4c6f],a[0x4c70],a[0x6e]],[frame,frame,frame]);
}
console.log('OK - resident meter sprite drawing');
