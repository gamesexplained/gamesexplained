'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const values of [Array.from({length:32},(_,i)=>i),Array.from({length:32},(_,i)=>31-i),Array.from({length:32},(_,i)=>i%5)]){
 const a=base.slice();a[0x79]=0;a.set(Array.from({length:32},(_,i)=>i),3);a.set(values,0x4ccf);a.set([0x20,0x16,0x2c,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:12000});assert.equal(cpu.pc,0x2f3);const order=Array.from({length:32},(_,i)=>i).sort((i,j)=>values[j]-values[i]);for(let i=0;i<30;i+=2){order[i]&=0xfe;order[i+1]|=1;}assert.deepStrictEqual([...a.slice(3,35)],order);assert.deepStrictEqual([...a.slice(0x23,0x43)],values);assert.equal(a[0x79],1);assert.equal(a[0x4d1f],31);
}
{
 const a=base.slice();a[0x79]=1;a.set([0x12,0x34],0x4d1f);a.set(Array.from({length:32},(_,i)=>i),3);a.set([0x20,0x16,0x2c,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:30});assert.equal(cpu.pc,0x2f3);assert.deepStrictEqual([...a.slice(0x44,0x46)],[0x34,0x12]);assert.deepStrictEqual([...a.slice(3,35)],Array.from({length:32},(_,i)=>i));
}
console.log('OK - resident display sorting');
