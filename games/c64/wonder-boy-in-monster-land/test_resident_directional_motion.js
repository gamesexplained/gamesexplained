'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [type,dx,dy,clobber,which] of [[5,3,2,0,1],[5,254,254,0,2],[6,3,2,0,3],[20,254,254,0,4],[6,3,254,1,3],[5,0,128,0,1]]){
 const a=base.slice();a[0x191b]=type;a[0x56a8]=dx;a[0x5778]=dy;a[0x577c]=3;a[0x1992]=1;a[0x1981]=2;a[0x19a3]=30;a.fill(0,0x300,0x302);
 for(const [addr,num] of [[0x43f0,1],[0x43a2,2],[0x4574,3],[0x45bc,4]])a.set([0x8d,0,3,0xa9,num,0x8d,1,3,...(clobber?[0xa0,4]:[]),0x60],addr);
 a.set([0xa2,2,0xa9,0,0x20,0xc1,0x35,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:100});assert.equal(cpu.pc,0x2f7);
 const v=clobber?3:dy,signed=v<128?v:v-256,world=(0x201-signed)&65535;assert.deepStrictEqual([...a.slice(0x300,0x302)],[dx&128?(-dx)&255:dx,which]);assert.equal(a[0x1992],world&255);assert.equal(a[0x1981],world>>8);assert.equal(a[0x19a3],(30-v)&255);
}
console.log('OK - resident directional object motion');
