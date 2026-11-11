'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const reward of [0x05,0xff])for(let random=0;random<8;random++){
 const a=base.slice();a[0x4dbd]=1;a.fill(0,0x4dc7,0x4dcb);a.set([0xaa,0xbb],0x4f15);a.fill(0,0x300,0x302);a.set([0xa9,random,0x60],0x3020);a.set([0x8d,1,3,0x60],0x77e2);a.set([0x8d,0,3,0x60],0x4b0e);a.set([0xa9,reward,0x20,0x1f,0x77,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:200});assert.equal(cpu.pc,0x2f5);const offset=random<5?random:random&3,amount=(reward===5?0x05:0x65)+offset;assert.equal(a[0x4dca],amount);assert.deepStrictEqual([...a.slice(0x4f15,0x4f17)],reward===5?[0xaa,1+(amount&15)]:[7,1+(amount&15)]);assert.deepStrictEqual([...a.slice(0x300,0x302)],[2,2]);
}
for(const reward of [5,255])for(let random=0;random<8;random++){
 const a=base.slice();a[0x4dbd]=1;a.fill(0,0x4dc7,0x4dcb);a[0x191b]=0xfe;a[0x1ab3]=reward;a[0x1a2b]=3;a[0x1a3c]=4;a[0x192c]=0;a.fill(77,0x4ccf,0x4cd7);a.set([0xa9,random,0x60],0x3020);a[0x77e2]=0x60;a[0x4b0e]=0x60;a.set([0xa2,2,0x20,0x32,0x76,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:250});assert.equal(cpu.pc,0x2f5);const offset=random<5?random:random&3;assert.equal(a[0x4dca],(reward===5?5:0x65)+offset);assert.equal(a[0x191b],0);assert.equal(a[0x1ab3],0);assert.deepStrictEqual([...a.slice(0x4ccf,0x4cd7)],[77,77,77,255,255,77,77,77]);
}
for(const [type,xlow,random,hit] of [[0xfe,100,0,1],[0xfd,100,7,1],[0xfe,180,0,0]]){
 const a=base.slice();a.fill(0,0x1919,0x192a);a[0x191b]=type;a[0x1ab3]=255;a[0x1a2b]=3;a[0x1a3c]=4;a[0x192c]=0;a.fill(77,0x4ccf,0x4cd7);a[0x4cd2]=20;a[0x4c52]=0;a[0x4c72]=xlow;a[0x7a]=1;a[0x49]=20;a[0x4dae]=50;a[0x4dbd]=1;a.fill(0,0x4dc7,0x4dcb);a.set([0xa9,random,0x60],0x3020);a[0x77e2]=0x60;a[0x4b0e]=0x60;a.set([0x20,0xd6,0x74,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:500});assert.equal(cpu.pc,0x2f3);assert.equal(a[0x4dca],hit?0x65+(random<5?random:random&3):0);assert.equal(a[0x191b],hit?0:type);
}
console.log('OK - resident reward calculation for all forced offsets');
