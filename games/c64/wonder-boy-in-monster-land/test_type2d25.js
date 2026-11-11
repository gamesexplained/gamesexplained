'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-25'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
assert.equal(base[0x7f0c]|base[0x7f3c]<<8,0xa1b1);
{const a=base.slice();a[0x1ab2]=0;const cpu=new CPU(a);cpu.x=1;cpu.pc=0xa1b1;cpu.run({until:0xa1c5,maxSteps:20});assert.equal(cpu.pc,0xa1c5);assert.equal(a[0xa1c1]|a[0xa1c2]<<8,0xa1c5);}
for(const [hit,follow,timer,motion,phase,direction,contact,detect] of [[1,0,2,0,0,0,0,0],[0,1,2,0,0,0,0,0],[0,0,2,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,1],[0,0,0x87,0,0,0,0,0],[0,0,0x88,1,0,0,0,0],[0,0,2,1,1,128,1,0]]){
 const a=base.slice();a[0x1ac3]=timer;a[0x1af6]=motion;a[0x1b07]=phase;a[0x1ae5]=direction;a[0x1ad4]=3;a[0x1b2b]=9;a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x1179);a.set([follow?0x38:0x18,0x60],0x7227);a.set([0xe6,0x10,0x60],0x5d7a);a.set([0xe6,0x11,0x60],0x4342);a.set([detect?0x38:0x18,0x60],0x44de);a.set([0xe6,0x12,contact?0x38:0x18,0x60],0x4574);a.set([0xe6,0x13,contact?0x38:0x18,0x60],0x45bc);a.set([0x20,0xc5,0xa1,0xea],0x02f0);const cleanup=!!(hit||follow||(motion&&phase===0&&!contact)),target=cleanup?0x4454:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.equal(a[0x1b2b],cleanup?8:9);if(cleanup){assert.equal(a[0xa244],1);assert.equal(cpu.x,1);}if(!hit&&!follow){let v=timer>0&&timer<128?timer-1:timer===0&&detect?0x81:timer===0?0x80:timer;if((v&128)&&v<0x88)v++;assert.equal(a[0x1ac3],v);assert.equal(a[0x1ae5],motion&&contact?direction^255:direction);}
}
console.log('OK - load-25 type-$2D captured dispatch and handler paths');
