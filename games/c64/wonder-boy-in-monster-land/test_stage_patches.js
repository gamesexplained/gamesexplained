'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const targets=[[0x9feb,0x7d],[0x9d4e,0x87],[0xa7be,0x7d],[0xa3cf,0x7d]], selectors=[10,14,28,29];
for(const selector of [...selectors,31]){
 const m=base.slice();m[0x2a91]=selector;for(const [a] of targets)m.set([0x55,0x55,0x55],a);
 new CPU(m).call(0x2a90,{}, {maxSteps:10000});
 for(let i=0;i<targets.length;i++)assert.deepEqual(Array.from(m.slice(targets[i][0],targets[i][0]+3)),selector===selectors[i]?[0x20,targets[i][1],0x2a]:[0x55,0x55,0x55]);
}
{
 const m=base.slice();m[0x2a91]=1;m[0x2a34]=5;m.fill(0,0xccd0,0xcd18);new CPU(m).call(0x2a90,{}, {maxSteps:10000});
 assert.equal(m[0x93c3],0x15);assert.deepEqual(m.slice(0xccd0,0xcd18),base.slice(0x2a35,0x2a7d));
}
for(const state of [3,4]){
 const m=base.slice();m[0x2a91]=2;m[0x4dd7]=state;m[0x2e0]=0;m.set([0xee,0xe0,2,0x60],0xad0e);new CPU(m).call(0x2a90,{}, {maxSteps:10000});assert.equal(m[0x2e0],state===4?1:0);
}
console.log('OK - transition selector patches, character copy and conditional jump');
