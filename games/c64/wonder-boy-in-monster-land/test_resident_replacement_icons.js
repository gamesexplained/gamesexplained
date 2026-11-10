'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [entry,target,rows] of [[0x417d,0x4193,[[0x41df,0x4f8a],[0x41e2,0x4f9f]]],[0x4194,0x41b0,[[0x41e5,0x4fb4],[0x41e8,0x4fc9],[0x41eb,0x4fde]]]]){
 const m=base.slice();for(const [i,[src]] of rows.entries())m.set([0x21+i*3,0x22+i*3,0x23+i*3],src);const cpu=new CPU(m);cpu.a=0x5a;cpu.y=2;cpu.pc=entry;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);for(const [i,[,dst]] of rows.entries())assert.deepEqual([...m.slice(dst+2,dst+5)],[0x21+i*3,0x22+i*3,0x23+i*3]);assert.deepEqual([cpu.a,cpu.x,cpu.y],[0x5a,3,5]);
}
console.log('OK - resident two- and three-row icon replacement');
