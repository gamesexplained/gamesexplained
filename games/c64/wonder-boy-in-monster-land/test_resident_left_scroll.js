'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [x,hi,step,fine,right,width,nx,nhi,nfine,calls] of [[200,0,4,2,4,8,196,0,2,[0,0,0]],[172,0,4,2,4,8,170,0,4,[0,0,0]],[170,0,3,2,4,8,170,0,5,[0,0,0]],[170,0,3,6,4,8,170,0,1,[1,1,1]],[170,0,3,6,0,8,168,0,7,[0,0,0]],[30,0,4,6,0,8,28,0,7,[0,0,0]]]){
 const a=base.slice();a[0x47]=x;a[0x48]=hi;a[0x4db1]=step;a[0x4d6a]=fine;a[0x569b]=right;a[0x7f4b]=width;a.fill(0,0x300,0x303);for(const [addr,i] of [[0x2d82,0],[0x1107,1],[0x30ee,2]])a.set([0xee,i,3,0x60],addr);a.set([0x20,0x69,0x10,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:150});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([a[0x47],a[0x48],a[0x4d6a]],[nx,nhi,nfine]);assert.deepStrictEqual([...a.slice(0x300,0x303)],calls);
}
console.log('OK - resident leftward player scrolling');
