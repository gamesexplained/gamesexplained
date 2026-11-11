'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);assert.equal(m[0x7edf+0x2f]|m[0x7f0f+0x2f]<<8,0x9a11);
for(const state of [0,1,4,9,255]){const a=m.slice();a[0x1ab2]=state;a[0x1b29]=0x7a;a[0x19e6]=0xfe;a.fill(0,0x10,0x13);a.set([0x85,0x12,0xe6,0x10,0x60],0x35c1);const target=state===0?0x9a1f:0x9a41,cpu=new CPU(a);cpu.x=1;cpu.pc=0x9a11;cpu.run({until:target,maxSteps:100});const next=(state+1)&255;assert.equal(a[0x1ab2],next);assert.deepEqual([...a.slice(0x10,0x13)],[1,0,0x7a]);if(state){const offset=next<5?0:next<10?2:4;assert.equal(a[0x9a74],offset/2);assert.equal(a[0x19c4],(0xfe+offset)&255)}}
console.log('OK - load-31 type-$2F frame selection');
