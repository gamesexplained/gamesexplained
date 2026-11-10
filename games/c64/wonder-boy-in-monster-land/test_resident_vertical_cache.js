'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [entry,target,down,exclude] of [[0x0d26,0x0d41,0,1],[0x0d42,0x0d53,0,0],[0x0e05,0x0e20,1,1],[0x0e21,0x0e32,1,0]]){
 const m=base.slice(),values=Array.from({length:28},(_,i)=>i===5||i===17?255:i);m.set(values,0x27);m[0x4db4]=7;m.set([2,10],0x0d54);const cpu=new CPU(m);cpu.pc=entry;cpu.run({until:target,maxSteps:600});assert.equal(cpu.pc,target);assert.deepEqual([...m.slice(0x27,0x43)],values.map((v,i)=>v===255||(exclude&&(i===2||i===10))?v:(v+(down?7:-7))&255));
}
console.log('OK - resident vertical display-cache adjustment loops');
