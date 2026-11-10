'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-03'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [busy,carry,random,frame] of [[1,0,0,9],[1,1,0,9],[0,0,189,250],[0,1,189,250],[0,0,190,9],[0,1,190,9]]){
 const m=base.slice();m.set([carry?0x38:0x18,0x60],0x72fc);m.set([0xe6,0x10,0x60],0x9df1);m.set([0xa9,random,0x60],0x3020);m[0x10]=0;m[0x1ae5]=busy;m[0x19e6]=frame;const target=busy?0x9bc9:random<190?0x9c5a:0x9bea;const cpu=new CPU(m);cpu.x=1;cpu.pc=0x9bb6;cpu.run({until:target,maxSteps:60});assert.equal(cpu.pc,target);assert.equal(m[0x10],1);assert.equal(m[0x9e27],carry?128:0);if(!busy){const offset=carry?0:12;assert.equal(m[0x19c4],(frame+offset)&255);assert.equal(m[0x19d5],(frame+offset+2)&255);}
}
console.log('OK - load 3 type-$07 state 0 front paths');
