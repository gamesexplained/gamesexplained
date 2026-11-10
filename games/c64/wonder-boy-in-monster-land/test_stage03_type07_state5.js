'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [active,sign,frame] of [[0,0,9],[1,0,9],[1,128,9],[1,0,250],[1,128,250]]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x45bc);m.set([0x85,0x12,0xe6,0x13,0x60],0x4574);m.fill(0,0x10,0x14);m[0x1a90]=active;m[0x9e27]=sign;m[0x19e6]=frame;
 const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9db6;const target=active?0x9ddd:0x9cd6;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.deepEqual([...m.slice(0x10,0x14)],!active?[0,0,0,0]:sign?[0,0,8,1]:[8,1,0,0]);
 if(active){const offset=sign?8:18;assert.equal(m[0x19c4],(frame+offset)&255);assert.equal(m[0x19d5],(frame+offset+2)&255);}
}
console.log('OK - load 3 type-$07 state 5 movement and frame paths');
