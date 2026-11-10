'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,d] of [[2,0xbbd7],[4,0xb25f],[6,0xb26e],[15,0xa7f5],[17,0x9dec]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const [delay,phase,carry,allocated] of [[2,0,0,0],[0,3,1,0],[0,0,0,0],[0,0x85,1,0],[0,0x86,0,0],[0,0x86,0,1],[0,0x86,1,1]]){
  const run=m.slice();run[d+0x242]=0x60;run.set([carry?0x38:0x18,0x60],0x72fc);run.set([0x85,0x10,0x60],0x4342);run.set([0x85,0x11,0x60],0x4368);run.set([0xa2,2,allocated?0x38:0x18,0x60],0x190b);run[0x447a]=0x60;run[0x1b18]=5;run[0x1af6]=delay;run[0x1b07]=phase;run[0x19e6]=250;run[0x1ab2]=1;run[0x10]=run[0x11]=0xff;for(const [a,v] of [[0x194d,1],[0x193c,2],[0x1991,3],[0x1980,4]])run[a]=v;
  const target=delay?d+0xd7:phase>0&&phase<128?d+0xe5:phase<0x86?d+0xfa:d+0x159;const cpu=new CPU(run);cpu.pc=d+0xac;cpu.x=1;cpu.run({until:target,maxSteps:200});const direction=5|(carry?0:128);assert.equal(run[0x1b18],direction);assert.equal(run[d+0x288],direction);assert.equal(run[0x1af6],delay?delay-1:0);
  if(delay){assert.equal(run[0x1b07],phase);continue}if(phase>0&&phase<128){assert.equal(run[0x10],phase);assert.equal(run[0x1b07],phase-1);continue}
  const actualPhase=phase===0?0x80:phase;assert.equal(run[0x11],actualPhase&127);if(actualPhase<0x86){assert.equal(run[0x1b07],actualPhase+1);continue}
  assert.equal(cpu.x,1);assert.equal(run[0x1ab2],0);if(!allocated)continue;for(const [a,v] of [[0x194e,1],[0x193d,2],[0x1992,3],[0x1981,4],[0x191b,0x22],[0x19f8,7],[0x1a09,0],[0x1aa2,0],[0x1ac4,direction],[0x1ad5,1],[0x1b29,1]])assert.equal(run[a],v,`load ${load} location ${a.toString(16)}`);const expected=carry?6:9;assert.equal(run[0x19c5],expected);assert.equal(run[0x19e7],expected);
 }
}
console.log('OK - type-5 state 1 countdown, allocation failure and success in five loads with callees stubbed');
