'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [px,ey,target] of [[100,71,0x21d8],[100,74,0x21c3],[20,74,0x2157],[100,90,0x2157]]){const m=base.slice();m.set([px,0,50],0x47);m[0x4c72]=100;m[0x4c52]=0;m[0x4cd2]=ey;m[0x4db4]=4;const cpu=new CPU(m);cpu.x=2;cpu.y=3;cpu.a=17;cpu.pc=0x2173;cpu.run({until:target,maxSteps:80});assert.equal(cpu.pc,target);assert.equal(m[0x219b],17);if(target===0x21c3)assert.equal(m[0x4db4],3);}
console.log('OK - platform horizontal and vertical contact paths');
