'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
const d=0x954d;for(const type of [0x2d,0x2e])assert.equal(m[0x7edf+type]|m[0x7f0f+type]<<8,d);
for(const [state,offset] of [0x1e,0x53,0x1fc,0x21e,0x32d,0x378].entries()){const a=m.slice(),target=d+offset;a[0x1ab2]=state;const cpu=new CPU(a);cpu.x=1;cpu.pc=d;cpu.run({until:target,maxSteps:20});assert.equal(cpu.pc,target);assert.equal(a[d+16]|a[d+17]<<8,target)}
console.log('OK - load-31 type-$2D/$2E vectors and six patched jump targets');
