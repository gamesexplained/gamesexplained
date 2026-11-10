'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xbbd7],[4,0xb25f],[6,0xb26e],[15,0xa7f5],[17,0x9dec]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const state of [2,3])for(const timer of [0,1])for(const direction of [0,128])for(const result of [0,2])for(const index of [0,3]){
  const run=m.slice();run[d+0x242]=0x60;run[0x1ad4]=timer;run[0x1b18]=direction;run[0x1af6]=index;run[0x19e6]=254;run[0x1ab2]=state;run[0x10]=run[0x11]=0;run.set([0xe6,0x10,0xa9,result,0x60],0x4574);run.set([0xe6,0x11,0xa9,result,0x60],0x45bc);const early=timer!==0&&result===2,target=state===2?(early?d+0x192:d+0x1a5):(early?d+0x1de:d+0x1e4);const cpu=new CPU(run);cpu.pc=d+(state===2?0x15a:0x1a6);cpu.x=1;cpu.run({until:target,maxSteps:100});
  assert.equal(run[0x1af6],(index+1)%4);assert.equal(run[0x19c4],(([2,2,0,0][index]+(direction?6:0))&255)+254&255);assert.equal(run[0x10],timer&&direction?1:0);assert.equal(run[0x11],timer&&!direction?1:0);assert.equal(run[0x1ab2],early?state:state===2?3:0);if(!early&&state===2){assert.equal(run[0x1ad4],255);assert.equal(run[0x1b18],direction^128)}else assert.equal(run[0x1ad4],(timer-1)&255);
 }
}
console.log('OK - type-5 states 2 and 3 frame, countdown and callback outcomes in five loads with callees stubbed');
