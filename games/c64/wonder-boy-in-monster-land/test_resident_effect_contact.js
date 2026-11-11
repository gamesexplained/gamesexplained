'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const base = new Uint8Array(65536);
for (const part of ['resident','stage-24']) for (const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records) if (r.b) base.set(r.b,r.a);
for (const [x,y,direction,hit] of [[100,20,0,true],[120,20,0,false],[100,80,0,false],[100,20,128,true],[255,20,0,false]]) {
 const a = base.slice(); a[0x49]=20; a[0x4dae]=50; a.set([1,1,1,0,1,1,1,1],0x4d21); a[0x4d2c]=x; a[0x4d34]=0; a[0x4d39]=y; a[0x4d51]=direction; a.fill(0,0x300,0x304);
 a.set([0x8d,0,3,0xee,1,3,0x60],0x4b0e); a.set([0x8d,2,3,0xee,3,3,0x60],0x7874); a.set([0x20,0x72,0x75,0xea],0x2f0);
 const cpu = new CPU(a); cpu.pc=0x2f0; cpu.run({until:0x2f3,maxSteps:1000}); assert.equal(cpu.pc,0x2f3);
 assert.deepStrictEqual([...a.slice(0x300,0x304)],hit?[2,1,direction?21:5,1]:[0,0,0,0]);
 assert.deepStrictEqual([...a.slice(0x4d21,0x4d29)],hit?[1,1,1,1,1,1,1,1]:[1,1,1,0,1,1,1,1]);
}
console.log('OK - resident effect contact and reward cases');
