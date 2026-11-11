'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-20'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [active,sign,frame] of [[0,0,10],[1,0,10],[1,128,10],[1,128,240],[1,0,250]]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x45bc);m.set([0x85,0x12,0xe6,0x13,0x60],0x4574);m.fill(0,0x10,0x14);m[0x1a90]=active;m[0x1ac3]=sign;m[0x1ad4]=9;m[0x1ab2]=1;m[0x19e6]=frame;const target=active?0xbe7c:0xbe82,cpu=new CPU(m);cpu.x=1;cpu.pc=0xbe49;cpu.run({until:target,maxSteps:50});assert.equal(cpu.pc,target);
 if(!active){assert.equal(m[0x1ab2],0);assert.deepEqual([...m.slice(0x10,0x14)],[0,0,0,0]);}else{const wraps=Boolean(sign)&&((frame+16)&255)===0;assert.deepEqual([...m.slice(0x10,0x14)],wraps?[8,1,8,1]:sign?[8,1,0,0]:[0,0,8,1]);const value=(frame+(!sign||wraps?6:16))&255;assert.equal(m[0x19c4],value);assert.equal(m[0x19d5],(value+2)&255);assert.equal(m[0x1ad4],0);}
}
console.log('OK - load 20 type-$1B state 1 direction and wrapped frame');
