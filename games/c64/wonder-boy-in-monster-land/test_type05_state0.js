'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xbbd7],[4,0xb25f],[6,0xb26e],[15,0xa7f5],[17,0x9dec]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [column,anchor,carry,direction,busy,enabled,random] of [[10,20,0,128,0,1,128],[20,10,1,0,0,1,0],[10,30,0,0,0,0,0],[10,30,1,0,0,1,128],[10,30,0,128,0,1,0],[10,20,1,128,1,1,0],[255,0,0,0,0,1,128]]){
  const run=m.slice();run[d+0x242]=0x60;run.set([carry?0x38:0x18,0x60],0x72fc);run.set([0xa2,column,0xa9,1,0x60],0x71db);run.set([0xa9,random,0x60],0x3020);run[0x6f3c]=anchor;run[0x1b18]=direction;run[0x1b29]=busy;run[0x1a2a]=enabled;run[0x1ab2]=0;run[0x19e6]=0;const near=Math.abs(column-anchor)<20&&!busy;const target=near||enabled?d+0xab:d+0x83;const cpu=new CPU(run);cpu.pc=d+0x1e;cpu.x=1;cpu.run({until:target,maxSteps:150});assert.equal(run[d+0x42],1);assert.equal(cpu.x,1);
  const normalized=(direction&127)|(carry?0:128);if(near){assert.equal(run[0x1ab2],1);assert.equal(run[0x1af6],5);assert.equal(run[0x1b07],6);assert.equal(run[0x1b18],normalized);assert.equal(run[0x19c4],normalized&128?8:2)}else if(enabled){assert.equal(run[0x1ab2],2);assert.equal(run[0x1ad4],10);assert.equal(run[d+0x194],10);assert.equal(run[0x1af6],0);assert.equal(run[0x1b18],random<128?(carry?128:0):normalized)}else assert.equal(run[0x1ab2],0);
 }
}
console.log('OK - type-5 state 0 distance, state and code patch in five loads with callees stubbed');
