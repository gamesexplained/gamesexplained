'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [top,left,fy,fx,mode,xhi,xlo] of [[255,32,0,7,0,1,129],[33,255,5,2,1,0,130],[0,0,7,7,1,1,0]]){
 const a=base.slice();a[0x569d]=top;a[0x569b]=left;a[0x4d69]=fy;a[0x4d6a]=fx;a[0x7a]=mode;a[0x47]=xlo;a[0x48]=xhi;a.set([3,2],0x6f3c);a.set([0,0],0x85d1);a.set([0x70,0x71],0x8622);a[0x7003]=0x35;a[0x7103]=0xa6;a.set([0x43,0x54],0x61d6);a.set([0x20,0x12,0x6e,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:150});assert.equal(cpu.pc,0x2f3);const wy=top*8+(fy^7),wx=left*8+(fx^7);assert.deepStrictEqual([a[0x569f],a[0x56a0],a[0x56a5],a[0x56a6],a[0x4dae]],[wy>>8,wy&255,wx>>8,wx&255,((xhi&1)<<7)|(xlo>>1)]);assert.deepStrictEqual([...a.slice(0x61d6,0x61d8)],mode?[0x35,0xa6]:[0x43,0x54]);
}
console.log('OK - resident viewport origins and map samples');
