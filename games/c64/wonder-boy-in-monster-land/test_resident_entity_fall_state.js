'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const records=JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records;
for(const [amount,carry,expected] of [[0,1,1],[7,0,8],[8,0,8],[9,0,10],[255,0,0]]){
 const m=new Uint8Array(65536);for(const r of records)if(r.b)m.set(r.b,r.a);m.set([carry?0x38:0x18,0x60],0x44de);m[0x1a7f]=0xcc;const cpu=new CPU(m);cpu.call(0x44c7,{a:amount,x:1},{maxSteps:100});assert.equal(m[0x1a7f],expected);
}
console.log('OK - fall state handles collision carry and exact threshold');
