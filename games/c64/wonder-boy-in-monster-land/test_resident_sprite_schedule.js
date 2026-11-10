'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const reused of [false,true])for(const [count,sy,raster,kind] of [[0,20,50,'end'],[2,20,50,'fast'],[2,29,50,'fast'],[2,40,50,'future'],[2,220,50,'end']]){
 const a=base.slice();a[0x45]=count;a.set([0x55,0x66],0x5e);a[0xd003]=sy;a[0x301]=raster;const operand=reused?0x183b:0x1764;a.set([1,3],operand);const cpu=new CPU(a);cpu.pc=reused?0x182a:0x1753;const end=kind==='fast'?(reused?0x17c7:0x16ed):(reused?0x1848:0x1779);cpu.run({until:end,maxSteps:80});assert.equal(cpu.pc,end);const expected=kind==='end'?[0xea,0x13]:(kind==='future'&&!reused?[0xb0,0x17]:[0x55,0x66]);assert.deepStrictEqual([...a.slice(0x5e,0x60)],expected);assert.equal(a[0x45],(count-1)&255);
}
for(const [values,count] of [[[0x49,0x4a,0x5f,0x60,0,255,0x50],3],[Array(7).fill(0x4a),7],[Array(7).fill(0x60),0]]){
 const a=base.slice();values.forEach((v,i)=>a[0xd001+i*2]=v);a[0x5294]=99;const cpu=new CPU(a);cpu.pc=0x1779;cpu.run({until:0x1795,maxSteps:100});assert.equal(cpu.pc,0x1795);assert.equal(a[0x5294],count);
}
console.log('OK - resident forced sprite scheduling branches');
