'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [stage,colour] of [[0,13],[1,null],[5,13],[6,15]]){
 const a=base.slice();a[0x4dd4]=stage;a[0x51b3+stage]=0;a[0x51ba+stage]=0x60;a.set(Array.from({length:20},(_,i)=>i),0x6000);for(let row=0;row<3;row++)a.fill(3,0xd84c+40*row,0xd850+40*row);a.set([0x20,0x90,0x4a,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:500});assert.equal(cpu.pc,0x2f3);
 for(let row=0;row<5;row++)assert.deepStrictEqual([...a.slice(0xc024+40*row,0xc028+40*row)],Array.from({length:4},(_,i)=>row*4+i));
 for(let row=0;row<3;row++)assert.deepStrictEqual([...a.slice(0xd84c+40*row,0xd850+40*row)],Array(4).fill(colour===null?3:colour));
}
console.log('OK - resident status graphic copy and colours');
