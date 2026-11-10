'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [detect,kind,contact] of [[1,1,0],[1,0,0],[1,128,0],[0,0,0],[0,0,1]]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x792c);m.set([detect?0x38:0x18,0x60],0x732a);m.set([contact?0x38:0x18,0x60],0x7227);m.set([0x85,0x12,0xe6,0x13,0x60],0x5d7a);m.set([0xe6,0x14,0x60],0x9cd6);m.fill(0,0x10,0x16);m[0x1a6e]=kind;m[0x1ab2]=2;m[0x1a90]=m[0x1ac3]=0;m.set([0x20,0xf1,0x9d,0xe6,0x15,0x60],0x0300);m.set([0x20,0x00,0x03,0xea],0x02f0);
 const cpu=new CPU(m);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:100});assert.equal(cpu.pc,0x02f3);assert.deepEqual([...m.slice(0x10,0x16)],!detect&&contact?[1,0,8,1,1,1]:[1,0,0,0,0,detect?0:1]);assert.equal(m[0x1ab2],detect?(kind===1?5:6):2);if(detect&&kind!==1){assert.equal(m[0x1a90],255);assert.equal(m[0x1ac3],10);}
}
console.log('OK - load 3 type-$07 hit helper and return-address removal');
