'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const records=JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records;
for(const [field,flag] of [[0,0],[0x80,0],[0x80,1]]){
 const m=new Uint8Array(65536);for(const r of records)if(r.b)m.set(r.b,r.a);
 m.set([0,3],0x47fd);m.set([0xe6,0x11,0xa2,9,0x60],0x300);m.set([0xe6,0x10,0x60],0x46d6);m[0x7b]=1;m[0x4754]=field;m[0x840]=flag;m[0x7a]=0;
 const cpu=new CPU(m);cpu.pc=0x47fc;const target=flag?0x479b:0x3384;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.deepEqual([m[0x10],m[0x11],m[0x7a],cpu.x],[field?1:0,1,255,1]);
}
console.log('OK - stage callback completion uses record index and exit flag');
