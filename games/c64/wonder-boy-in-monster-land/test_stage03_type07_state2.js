'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const phase of [2,255])for(const sign of [0,128])for(const carry of [0,1])for(const speed of [15,16]){
 const m=base.slice();m.set([0xe6,0x10,0x60],0x9df1);m.set([0x85,0x11,0xe6,0x12,0x60],0x4368);m.set([0x85,0x13,0xe6,0x14,0x60],0x43f0);m.set([0x85,0x15,0xe6,0x16,0x60],0x43a2);m.set([carry?0x38:0x18,0x60],0x72fc);m.fill(0,0x10,0x17);m[0x1ad4]=phase;m[0x1ab2]=2;m[0x1b07]=speed;m[0x9e27]=sign;
 const reset=Boolean(carry)!==Boolean(sign),target=reset?0x9ce0:0x9cd5;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9c9a;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.deepEqual([...m.slice(0x10,0x17)],[1,...(phase<128?[phase,1]:[0,0]),...(sign?[0,0,speed,1]:[speed,1,0,0])]);assert.equal(m[0x1ad4],reset?0:phase<128?phase-1:phase);assert.equal(m[0x1ab2],reset?3:2);assert.equal(m[0x1b07],reset?speed:Math.min(speed+1,16));
}
console.log('OK - load 3 type-$07 state 2 phase, direction and contact paths');
