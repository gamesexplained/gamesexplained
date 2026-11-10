'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-price-observations.json'))),bcd=n=>((Math.floor(n/10)<<4)|(n%10)),number=b=>(b>>4)*10+(b&15);let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(let index=0;index<o.entries;index++){const lo=m[o.table+index*8],hi=m[o.table+index*8+1];assert((lo&15)<10&&(lo>>4)<10&&(hi&15)<10&&(hi>>4)<10);const price=number(hi)*100+number(lo);
  for(const balance of new Set([0,Math.max(0,price-1),price,9999])){const run=m.slice();run[0x4dbd]=0;run[0x4dc9]=bcd(balance%100);run[0x4dc7]=bcd(Math.floor(balance/100));const cpu=new CPU(run);cpu.pc=o.entry;cpu.a=index;cpu.run({until:o.entry+17,maxSteps:150});const expected=balance>=price?balance-price:balance;assert.equal(run[0x7d],lo);assert.equal(run[0x7e],hi);assert.equal(run[0x4dc9],bcd(expected%100),`load ${o.load} index ${index} balance ${balance}`);assert.equal(run[0x4dc7],bcd(Math.floor(expected/100)));assert.equal(cpu.c,balance>=price?1:0);assert.equal(cpu.d,0);cases++}
 }
}
console.log(`OK - ${cases} controlled shop price deductions and insufficient-funds restorations`);
