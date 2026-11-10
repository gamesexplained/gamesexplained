'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const fields=[0x1a07,0x1a7e,0x192a,0x1a8f,0x1a4b,0x1a5c,0x1ab1,0x1ac2,0x1ad3,0x1ae4,0x1af5,0x1b06,0x1b17,0x1b28,0x1919,0x1a6d];
for(const [flags,third,fourth,marked] of [[0,3,4,[]],[1,0,4,[]],[1,3,4,[3,4]],[1,3,0,[3,0]]]){
 const a=base.slice();for(const address of fields)a[address+2]=0x44;a[0x192c]=flags;a[0x1a4d]=third;a[0x1a5e]=fourth;a.fill(77,0x4ccf,0x4cd7);a.set([0xa2,2,0x20,0x7a,0x44,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:80});assert.equal(cpu.pc,0x2f5);for(const address of fields)assert.equal(a[address+2],0);assert.deepStrictEqual([...a.slice(0x4ccf,0x4cd7)],Array.from({length:8},(_,i)=>marked.includes(i)?255:77));
}
{
 const a=base.slice();a[0x4dbd]=1;a[0x4ddc]=3;a[0x7f6c]=0x77;a[0x192c]=1;a[0x1a4d]=3;a[0x1a5e]=0;a.fill(77,0x4ccf,0x4cd7);a.fill(0,0x300,0x303);a.set([0x8d,0,3,0xa2,7,0x60],0x77e2);a.set([0x8d,1,3,0x8e,2,3,0x60],0x4342);a.set([0xa2,2,0x20,8,0x60,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:130});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([...a.slice(0x4ccf,0x4cd7)],[255,77,77,255,77,77,77,77]);assert.deepStrictEqual([...a.slice(0x300,0x303)],[20,12,2]);assert.equal(a[0x191b],0xf8);assert.equal(a[0x19e7],0x77);
}
console.log('OK - resident entity reset and extra-slot links');
