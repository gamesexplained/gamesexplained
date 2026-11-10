'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
{
 const m=base.slice(),id=3,a=0xaba1+id*8;m[a+6]=0x34;m[a+7]=0x12;const cpu=new CPU(m);cpu.pc=0xa7da;cpu.a=id;cpu.p&=~8;cpu.run({until:0x77e0,maxSteps:25});assert.equal(cpu.pc,0x77e0);assert.equal(cpu.x|cpu.y<<8,0x1234);
}
{
 const m=base.slice();m.set([0,2,3,4],0xa845);m[0xa800]=0xc1;const cpu=new CPU(m);cpu.call(0xa7ec,{y:0x9b},{maxSteps:100});assert.deepEqual([...m.slice(0xc198,0xc19c)],[0,0xf7,0xf8,0xf9]);assert.deepEqual([...m.slice(0xd998,0xd99c)],[1,1,1,1]);
}
console.log('OK - first-load item description pointer and digit drawing');
