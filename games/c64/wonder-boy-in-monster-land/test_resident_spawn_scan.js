'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const records=JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records;
for(const [types,slots,x,carry,y] of [[{}, {},255,0,null],[{16:128,15:33,8:2},{8:0},255,0,null],[{16:33,9:32,5:1},{9:7,5:8},9,1,7],[{16:1,15:2},{16:0,15:4},15,1,4]]){
 const m=new Uint8Array(65536);for(const r of records)if(r.b)m.set(r.b,r.a);m.fill(0,0x1919,0x192a);m.fill(0,0x1a29,0x1a3a);for(const [i,v] of Object.entries(types))m[0x1919+Number(i)]=v;for(const [i,v] of Object.entries(slots))m[0x1a29+Number(i)]=v;
 const cpu=new CPU(m);cpu.call(0x09c5,{}, {maxSteps:1000});assert.equal(cpu.x,x);assert.equal(cpu.c,carry);if(y!==null)assert.equal(cpu.y,y);
}
console.log('OK - descending entity candidate scan and failure carry');
