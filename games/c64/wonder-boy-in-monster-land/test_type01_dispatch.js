'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [load,start] of [[2,0xb97e],[3,0x98c5],[4,0xb006],[12,0xa253],[13,0x91da],[14,0xa038],[15,0xa492],[17,0x9a89],[19,0xb765],[20,0xba9c],[23,0xb076],[26,0xa738]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7ee0]|m[0x7f10]<<8,start,`load ${load} type 1 vector`);
 for(const [state,offset] of [0x18,0x7d,0xb4].entries()){
  const run=m.slice(),target=start+offset;run[0x1ab2]=state;const cpu=new CPU(run);cpu.pc=start;cpu.x=1;cpu.run({until:target,maxSteps:30});assert.equal(run[start+16]|run[start+17]<<8,target,`load ${load} state ${state}`);assert.equal(m[start+18+state]|m[start+21+state]<<8,target);
 }
}
console.log('OK - twelve type-1 dispatchers and their three captured targets');
