'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[13,0x929d],[14,0xa0fb],[15,0xa555],[17,0x9b4c],[19,0xb828]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [direction,timer,frame] of [[0,0,0x20],[128,4,0x20],[255,4,255]]){const m=original.slice();m[0x1ad4]=direction;m[0x1ae5]=timer;m[0x19e6]=frame;new CPU(m).call(d+0xc6,{x:1});const offset=direction===128?0:8,t=((timer>>1)&2)+frame;assert.equal(m[d+0xdd],offset);assert.equal(m[0x19c4],((t&255)+offset+(t>>8))&255);new CPU(m).call(d+0xbd,{x:1});assert.equal(m[0x1ad4],direction^128)}
}
console.log('OK - type-$02 direction and frame helpers in five loads');
