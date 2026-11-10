'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [detect,contact,sign,move] of [[1,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,128,0],[0,0,0,1],[0,0,128,1]]){
 const m=base.slice();m.set([0x60],0x792c);m.set([detect?0x38:0x18,0x60],0x1179);m.set([contact?0x38:0x18,0x60],0x7227);m.set([0x85,0x10,0xe6,0x11,0x60],0x5d7a);m.set([0x85,0x12,0xe6,0x13,move?0x38:0x18,0x60],0x4574);m.set([0x85,0x14,0xe6,0x15,move?0x38:0x18,0x60],0x45bc);m.fill(0,0x10,0x16);m[0x1ae5]=sign;
 const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9e42;const target=detect||contact||move?0x9eb0:sign?0x9e71:0x9e6b;cpu.run({until:target,maxSteps:80});assert.equal(cpu.pc,target);
 const effect=contact&&!detect?[4,1]:[0,0],direction=!detect&&!contact?(sign?[0,0,10,1]:[10,1,0,0]):[0,0,0,0];assert.deepEqual([...m.slice(0x10,0x16)],[...effect,...direction]);
 if(detect||contact||move)assert.deepEqual([m[0x1ab2],m[0x1ac3],m[0x19e6],m[0x19c4],m[0x1a08]],[3,2,0xab,0xab,7]);
}
console.log('OK - load 3 type-$24 state 0 detection, contact and movement paths');
