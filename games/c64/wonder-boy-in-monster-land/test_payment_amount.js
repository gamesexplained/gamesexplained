'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [value,digits] of [[0,[0,0,0,1]],[5,[0,0,0,6]],[0x12,[0,0,2,3]],[0xff,[0,0,16,16]]]){
 const m=base.slice();m.set([0x84,0x10,0xa2,0,0xa0,0,0x60],0xa7ec);const cpu=new CPU(m);cpu.call(0xa504,{a:value,x:7,y:0x9b},{maxSteps:200});assert.deepEqual([...m.slice(0xa845,0xa849)],digits);assert.equal(m[0x10],0x9b);assert.equal(cpu.x,7);
}
console.log('OK - payment amount digits and saved X with draw callback stubbed');
