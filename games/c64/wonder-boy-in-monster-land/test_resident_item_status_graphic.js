'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const typ of [0,1,2]){
 const m=base.slice();for(const [address,start] of [[0x5244,10],[0x5264,40],[0x5284,70]])for(let i=0;i<24;i++)m[address+i]=(start+i)&255;m.set([5,6,7],0x52a4);const cpu=new CPU(m);cpu.a=typ;cpu.pc=0x5326;cpu.run({until:0x5355,maxSteps:200});assert.equal(cpu.pc,0x5355);assert.equal(m[0x534a],5+typ);assert.deepEqual([...m.slice(0x4fbf,0x4fc7)],[...Array(8).keys()].map(y=>10+typ*8+7-y));for(const [addr,start] of [[0x4f95,40],[0x4faa,70]])assert.deepEqual([...m.slice(addr,addr+6)],[...Array(6).keys()].map(y=>start+typ*8+7-y));for(const addr of [0x4ffe,0x5013])assert.deepEqual([...m.slice(addr,addr+6)],Array(6).fill(5+typ));
}
console.log('OK - resident status graphic table selector and cell copies');
