'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [x,y] of [[0,0],[0x53,0xa7]]){
 const a=base.slice();a.set([0xa2,x,0xa0,y,0x20,0x9e,0x71,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:100});assert.equal(cpu.pc,0x2f7);const expected={0xd025:10,0xd026:9,0x4c73:x,0x4c74:x,0x4c53:0,0x4c54:0,0x4cb3:0,0x4c33:0,0x4c34:1,0x4cb4:1,0x4c93:0x97,0x4c94:0x98,0x4cd3:y,0x4cd4:y,0x79:0};for(const [address,value] of Object.entries(expected))assert.equal(a[Number(address)],value);
}
console.log('OK - resident display initialization');
