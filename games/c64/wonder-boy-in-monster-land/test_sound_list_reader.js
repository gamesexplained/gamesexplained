'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [offset,expected,final,control] of [[0,0x1234,2,0x55],[2,0x7856,4,0x55],[4,0x1234,2,8]]){const m=base.slice();m.set([0x34,0x12,0x56,0x78,0,0],0x300);m.set([0,3],0x2227);m[0x223e]=offset;m[0x22ef]=8;m[0x2c15]=0x55;const cpu=new CPU(m);cpu.x=0;cpu.call(0x22dc,{}, {maxSteps:50});assert.equal(m[0x2225]|m[0x2226]<<8,expected);assert.equal(m[0x223e],final);assert.equal(m[0x2c15],control);}
console.log('OK - sound list reader and restart');
