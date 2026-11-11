'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[13,0x929d],[14,0xa0fb],[15,0xa555],[17,0x9b4c],[19,0xb828]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [direction,timer,frame] of [[0,1,0x20],[128,1,0x20],[0,0,0xfc],[128,0,0xfc]]){const m=original.slice();m[0x1ad4]=direction;m[0x1ae5]=timer;m[0x19e6]=frame;m.fill(0,0x10,0x13);m.set([0x85,0x11,0xe6,0x10,0x60],0x4b0e);m.set([0x85,0x12,0x60],0x5db9);new CPU(m).call(d+0x11c,{x:1});assert.equal(m[0x19c4],(frame+6+(direction===128?0:8))&255);assert.equal(m[0x1ae5],(timer-1)&255);assert.deepEqual([...m.slice(0x10,0x13)],timer===0?[1,32,2]:[0,0,0])}
}
console.log('OK - type-$02 state 2 in five loads');
