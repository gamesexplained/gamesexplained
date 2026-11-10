'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[8,0x97e0],[9,0xb97f],[27,0xadba]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [timer,busy,random,allocated,direction] of [[0,0,0,0,0],[1,1,0,0,128],[1,0,0,0,0],[1,0,128,0,128],[1,0,128,1,0]]){
  const run=m.slice();run[d+0x149]=0x60;run.set([0xa9,random,0x60],0x3020);run.set([0xa2,2,allocated?0x38:0x18,0x60],0x190b);run[0x1ad4]=timer;run[0x1b29]=busy;run[0x1ae5]=direction;run[0x19e6]=250;run[0x1ab2]=1;for(const [a,v] of [[0x194d,1],[0x193c,2],[0x1991,3],[0x1980,4]])run[a]=v;const target=timer===0?d+0xa8:busy?d+0x48:random<128?d+0x4e:d+0x9d;const cpu=new CPU(run);cpu.pc=d+0x27;cpu.x=1;cpu.run({until:target,maxSteps:150});
  if(!timer){assert.equal(run[0x1ad4],30);assert.equal(run[0x1ab2],2);continue}assert.equal(run[0x19c4],(250+(direction?6:0))&255);if(!busy&&random>=128){assert.equal(run[0x1b29],1);assert.equal(cpu.x,1);if(allocated){for(const [a,v] of [[0x1b18,2],[0x194e,1],[0x193d,2],[0x1992,3],[0x1981,4],[0x1a09,1],[0x191b,0x25],[0x1aa2,0],[0x19c5,6],[0x19e7,6],[0x1b2a,127],[0x1ad5,1]])assert.equal(run[a],v)}}
 }
 for(const [timer,direction,result,count,phase] of [[0,0,0,0,0],[1,128,0,0,0],[1,0,2,3,0],[1,128,2,0,0],[1,0,2,0,1]]){
  const run=m.slice();run[d+0x149]=0x60;run[0x1ad4]=timer;run[0x1ae5]=direction;run[0x1b07]=count;run[0x1af6]=phase;run[0x19e6]=250;run[0x10]=run[0x11]=0;run.set([0xe6,0x10,0xa9,result,0x60],0x4574);run.set([0xe6,0x11,0xa9,result,0x60],0x45bc);const target=!timer||result!==2?d+0x1d:count?d+0xd7:d+0xfe;const cpu=new CPU(run);cpu.pc=d+0xa8;cpu.x=1;cpu.run({until:target,maxSteps:120});assert.equal(run[0x1ad4],(timer-1)&255);
  if(!timer)continue;assert.equal(run[0x10],direction?1:0);assert.equal(run[0x11],direction?0:1);if(result!==2){assert.equal(run[0x1ae5],direction^128);continue}if(count){assert.equal(run[0x1b07],count-1);continue}assert.equal(run[0x1b07],4);assert.equal(run[0x1af6],phase^1);assert.equal(run[0x19c4],(250+(direction?6:0)+((phase^1)===0?2:0))&255);
 }
}
console.log('OK - type-13 states 1 and 2 allocation and movement paths in three loads with callees stubbed');
