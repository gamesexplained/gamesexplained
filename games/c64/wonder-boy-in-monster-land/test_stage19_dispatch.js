'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);
for(const p of ['resident','stage-19'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [state,seed,result] of [[0,0x82,0],[0,2,7],[1,0,0],[2,0,0],[3,0,0],[4,0,0]]){
 const m=base.slice();m[0x1ab3]=state;m[0x9a4b]=seed;m[0x19e7]=0xfe;m.set([0xe6,0x10,0xa9,result,0x60],0x3020);m.set([0x86,0x11,0x84,0x12,0xe6,0x13,0x60],0x77e0);const cpu=new CPU(m);cpu.x=2;
 if(state<2){cpu.call(0xbc10,{}, {maxSteps:80});if(state===0){assert.equal(m[0x9a4b],(seed&128?seed:result)&3);assert.equal(m[0x10],seed&128?0:1);assert.equal(m[0x19c5],0xfe);assert.equal(m[0x19d6],0);assert.equal(m[0x1ab3],1);}else{assert.deepEqual([...m.slice(0x11,0x14)],[0xa5,0xbc,2]);assert.equal(m[0xbe95],2);assert.equal(m[0x1ab3],2);assert.equal(m[0x19c5],2);assert.equal(m[0x19d6],4);}}
 else{cpu.pc=0xbc10;const target=[0xbcdc,0xbe96,0xbf18][state-2];cpu.run({until:target,maxSteps:20});assert.equal(cpu.pc,target);}
}
console.log('OK - load-19 state dispatch and answer initialization');
