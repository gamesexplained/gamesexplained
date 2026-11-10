'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-20'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [carry,count,phase] of [[1,0,0],[1,0,127],[1,0,128],[1,1,5],[0,0,0],[0,0,128],[0,0,255],[0,1,5]]){
 const m=base.slice();m.set([carry?0x38:0x18,0x60],0x72fc);m[0x1b29]=count;m[0x1ad4]=phase;m[0x19e6]=250;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xbd7b;cpu.run({until:0xbdcd,maxSteps:70});assert.equal(cpu.pc,0xbdcd);let result;if(count&1)result=phase;else if(carry)result=phase&128?0:(phase+1)&255;else{result=phase&&!(phase&128)?0:(phase-1)&255;if(result<128)result=0;}const next=(count-1)&255,first=(250+(carry?0:10))&255;assert.deepEqual([m[0x1ad4],m[0x1b29],m[0x19c4],m[0x19d5]],[result,next,first,(first+((next>>1)&2)+2)&255]);
}
for(const phase of [0,4,5,9,10,255,251,250,246,245,128]){
 const m=base.slice();m.set([0x85,0x10,0xe6,0x11,0x60],0x43f0);m.set([0x85,0x12,0xe6,0x13,0x60],0x43a2);m.fill(0,0x10,0x14);m[0x1ad4]=phase;const cpu=new CPU(m);cpu.x=1;cpu.pc=0xbdcd;cpu.run({until:0xbdff,maxSteps:50});assert.equal(cpu.pc,0xbdff);const negative=Boolean(phase&128),magnitude=negative?(-phase)&255:phase,delta=magnitude-(negative?6:5),expected=delta<0?[0,0,0,0]:negative?[Math.min(delta,4),1,0,0]:[0,0,Math.min(delta,4),1];assert.deepEqual([...m.slice(0x10,0x14)],expected);assert.equal(m[0x1ad4],delta>=5?(negative?0xf7:9):phase);
}
console.log('OK - load 20 type-$1B animation and signed movement boundaries');
