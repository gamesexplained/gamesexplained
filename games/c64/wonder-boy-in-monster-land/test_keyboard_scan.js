'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [sample,divider] of [[0x80,2],[0x80,0],[0,2]]){const m=base.slice();m[0xdc01]=sample;m[0x2975]=divider;m[0x526c]=10;m[0x5274]=20;const cpu=new CPU(m);cpu.call(0x2951,{}, {maxSteps:60});assert.equal(m[0x5275],sample?255:0);assert.equal(m[0x2975],sample?(divider?divider-1:6):divider);assert.equal(m[0x526c],sample&&divider?11:10);assert.equal(m[0x5274],21);assert.equal(m[0xdc02],0);}
console.log('OK - keyboard scan and frame divider');
