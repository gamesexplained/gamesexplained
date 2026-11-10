'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const m=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
const ptr=m[0x7f55]|m[0x7f56]<<8,count=m[0x7f57],fields=[0x4747,0x474d,0x4759,0x4753,0x476b,0x4771,0x4777,0x477d,0x4783,0x4789,0x475f,0x4765];assert.equal(ptr,0x92cb);assert.equal(count,3);
const rows=Array.from({length:count},(_,i)=>[...m.slice(ptr+i*16,ptr+i*16+16)]);m[0x46d6]=0x60;new CPU(m).call(0x4655,{}, {maxSteps:2000});for(let i=0;i<count;i++)assert.deepEqual(fields.map(a=>m[a+i]),rows[i].slice(0,12));assert.deepEqual([...m.slice(0x7d,0x81)],rows[count-1].slice(12));
console.log('OK - first-load stage record copy with map callback stubbed');
