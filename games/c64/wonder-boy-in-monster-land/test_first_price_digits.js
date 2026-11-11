'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [high,low,digits] of [[0,0x12,[0,0,2,3]],[0x12,0x34,[2,3,4,5]],[0,0,[0,0,0,0]],[0,1,[0,0,0,2]],[0xff,0xff,[16,16,16,16]]]){
 const m=base.slice(),id=3,a=0xaba1+id*8;m[a]=low;m[a+1]=high;const cpu=new CPU(m);cpu.call(0xa807,{a:id},{maxSteps:400});assert.deepEqual([...m.slice(0xa845,0xa849)],digits);
}
console.log('OK - first-load price digit extraction and leading blanks');
