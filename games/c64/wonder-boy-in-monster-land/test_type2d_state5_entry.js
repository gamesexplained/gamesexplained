'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const timer of [0,1,128]){const a=m.slice();a[0x1b29]=timer;a.fill(0,0x10,0x18);for(const [addr,z] of [[0x9820,0x10],[0x4b20,0x11],[0x4454,0x12],[0x331d,0x13],[0x6acb,0x14],[0x77e0,0x15],[0x370b,0x16],[0x7119,0x17]])a.set([0xe6,z,0x60],addr);const cpu=new CPU(a);cpu.x=1;cpu.pc=0x98c5;cpu.run({until:timer?0x98cd:0x9934,maxSteps:200});assert.equal(a[0x1b29],(timer-1)&255);
 if(timer)assert.deepEqual([...a.slice(0x10,0x18)],[1,0,0,0,0,0,0,0]);else{assert.deepEqual([...a.slice(0x10,0x18)],[0,1,1,1,1,1,2,1]);for(const [addr,v] of [[0x2c15,254],[0x49,254],[0x79,0],[0x4cb3,15],[0x4cb4,8],[0x4c93,235],[0x4c94,236],[0x4cd3,200],[0x4cd4,200],[0x4c73,116],[0x4c74,116],[0x4c34,1],[0x4c53,0],[0x4c54,0],[0x4c33,0],[0x9a0f,0],[0x9a10,8]])assert.equal(a[addr],v)}}
console.log('OK - load-31 type-$2D/$2E state 5 setup');
