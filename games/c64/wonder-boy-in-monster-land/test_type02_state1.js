'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[13,0x929d],[14,0xa0fb],[15,0xa555],[17,0x9b4c],[19,0xb828]]){
 const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);
 for(const [timer,direction,result] of [[0,0,2],[1,0,2],[1,128,2],[1,0,0],[1,128,0]]){const m=original.slice();m[0x1ad4]=direction;m[0x1ae5]=timer;m[0x1ab2]=1;m[0x19e6]=0xfe;m.fill(0,0x10,0x13);m.set([0xe6,0x12,0x60],d+0xbd);m.set([0xe6,0x10,0xa9,result,0x60],0x4574);m.set([0xe6,0x11,0xa9,result,0x60],0x45bc);new CPU(m).call(d+0xe2,{x:1});const reset=timer===0||result!==2;assert.deepEqual([...m.slice(0x10,0x13)],timer===0?[0,0,1]:direction&128?[0,1,+reset]:[1,0,+reset]);if(reset){assert.equal(m[0x1ab2],0);assert.equal(m[0x1ae5],0)}else{assert.equal(m[0x1ab2],1);assert.equal(m[0x19c4],(0xfe+(direction&128?12:4))&255)}}
}
console.log('OK - type-$02 state 1 in five loads');
