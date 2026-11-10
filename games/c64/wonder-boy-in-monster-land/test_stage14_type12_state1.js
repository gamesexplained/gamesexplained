'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-14'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [timer,phase,sign,detect,kind,contact] of [[0,4,0,0,0,0],[11,0,0,0,0,0],[2,4,0,0,0,0],[2,4,128,0,0,1],[2,4,0,1,0,0],[2,4,0,1,1,1]]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x43a2);m.set([0x85,0x12,0xe6,0x13,0x60],0x43f0);m.set([detect?0x38:0x18,0x60],0x732a);m.set([contact?0x38:0x18,0x60],0x7227);m.fill(0,0x10,0x14);m[0x1ac3]=timer;m[0x1ae5]=phase;m[0x1ad4]=sign;m[0x1ab2]=1;m[0x1a6e]=kind;m[0x19e6]=0x50;m[0x1a2a]=3;m[0x4c52]=1;m[0x4c72]=0x40;m[0x4cd2]=0x60;
 const target=timer===0?0xa5fb:timer===11?0xa66f:detect&&kind===0?0xa65f:contact?0x5d7a:0xa649;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xa5ea;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);
 if(timer===0){assert.equal(m[0x1ac3],19);assert.equal(m[0x1ad4],128);}else if(timer===11)assert.deepEqual([m[0x1ac3],m[0x1ab2],m[0x1ae5]],[9,2,255]);else{assert.deepEqual([...m.slice(0x10,0x14)],sign?[4,1,0,0]:[0,0,4,1]);assert.equal(m[0x19c4],0x50);assert.deepEqual([...m.slice(0x762e,0x7632)],[0xa1,0x71,10,4]);if(target===0x5d7a)assert.equal(cpu.a,4);}
}
console.log('OK - load 14 type-$12 state 1 timer, direction and contact');
