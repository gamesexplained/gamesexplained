'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const [y,high,low,target] of [[0xca,0,0,0x4454],[0xc9,1,0x40,0x4454],[0xc9,1,0x41,0x9a57],[0xc9,0,0x1f,0x4454],[0xc9,0,0x20,0x9a5f]]){const a=m.slice();a[0x19a2]=y;a[0x196f]=high;a[0x195e]=low;const cpu=new CPU(a);cpu.x=1;cpu.pc=0x9a41;cpu.run({until:target,maxSteps:30});assert.equal(cpu.pc,target)}
console.log('OK - load-31 type-$2F coordinate limits');
