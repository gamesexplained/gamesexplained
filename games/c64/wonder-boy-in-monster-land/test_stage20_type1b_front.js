'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-20'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [slot,detect,kind,contact,effect,field0,field1] of [[0,0,0,0,0,0,0],[1,1,1,0,0,0,0],[1,1,1,0,1,0,0],[1,1,0,0,0,0,0],[1,1,128,0,0,0,0],[1,0,0,0,0,0,0],[1,0,0,1,0,0,0],[1,0,0,1,1,1,0],[1,0,0,1,1,0,4]]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x792c);m.set([detect?0x38:0x18,0x60],0x732a);m.set([contact?0x38:0x18,0x60],0x7227);m.set([effect?0x38:0x18,0x60],0x72fc);m.set([0x85,0x11,0xe6,0x12,effect?0x38:0x18,0x60],0x5d7a);m.fill(0,0x10,0x13);m[0x1a2a]=slot;m[0x1a6e]=kind;m[0x1ab2]=0;m[0x4dbd]=0;m[0x4dc7]=field0;m[0x4dc9]=field1;const target=!slot?0xbe20:detect?0xbd15:contact&&effect&&(field0||field1>=5)?0xbd35:0xbd7b,cpu=new CPU(m);cpu.x=1;cpu.pc=0xbced;cpu.run({until:target,maxSteps:80});assert.equal(cpu.pc,target);assert.equal(m[0x10],slot?1:0);assert.equal(m[0x1ab2],!slot||!detect?0:kind===1?1:2);if(slot&&detect&&kind===1)assert.equal(m[0x1ac3],effect?1:255);if(slot&&!detect&&contact)assert.deepEqual([...m.slice(0x11,0x13)],[4,target===0xbd35?1:2]);
}
console.log('OK - load 20 type-$1B state 0 entry branches');
