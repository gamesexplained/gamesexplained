'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[13,0x929d],[14,0xa0fb],[15,0xa555],[17,0x9b4c],[19,0xb828]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [timer,active,direction,other,face,result] of [[2,1,0,0,0,2],[2,1,128,0,0,0],[0,1,0,0,0,2],[251,0,0,0,0,2],[251,1,0,128,1,2],[251,1,0,0,0,2],[251,1,0,0,1,2]]){const m=original.slice();m[0x1ae5]=timer;m[0x1a2a]=active;m[0x1ad4]=direction;m[0x1ac3]=other;m.fill(0,0x10,0x12);m.set([face?0x38:0x18,0x60],0x72fc);m.set([0xe6,0x10,0xa9,result,0x60],0x45bc);m.set([0xe6,0x11,0xa9,result,0x60],0x4574);const cpu=new CPU(m);cpu.x=1;cpu.pc=d+0x5b;cpu.run({until:d+0xc6,maxSteps:100});const reset=timer===251,elapsed=(timer-1)&255,called=!(elapsed&128),toggle=reset||(called&&(result&6)!==2),expectedTimer=reset?20-(active&&!!face===!!(other&128)?1:0):elapsed;assert.equal(m[0x1ae5],expectedTimer);assert.equal(m[0x1ad4],toggle?direction^128:direction);assert.equal(m[0x1ac3],reset?other^128:other);assert.deepEqual([...m.slice(0x10,0x12)],called?(direction&128?[1,0]:[0,1]):[0,0])}
}
console.log('OK - type-$02 state-0 timer and movement paths in five loads');
