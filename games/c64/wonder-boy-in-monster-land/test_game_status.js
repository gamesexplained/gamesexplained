'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const tier of [0,1,255]){const m=base.slice();m[0x4ddb]=tier;m[0x29a3]=0x5a;m[0x5284]=0x93;m[0xdc02]=0x27;const cpu=new CPU(m);cpu.call(0x7b84,{}, {maxSteps:30});assert.equal(cpu.a,0x93);assert.equal(m[0xdc02],tier?0xff:0x27);}
console.log('OK - game status tier branches');
