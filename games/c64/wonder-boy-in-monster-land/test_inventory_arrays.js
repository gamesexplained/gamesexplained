'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const player of [0,1])for(const mode of ['append','merge','cap']){const m=base.slice(),type=player?0x5203:0x51c3,qty=player?0x5223:0x51e3;m[0x4dbd]=player;m[0x51c1+player]=mode==='append'?0:1;m[type+1]=5;m[qty+1]=mode==='cap'?0x90:0x12;const cpu=new CPU(m);cpu.a=5;cpu.x=0x15;cpu.call(0x536f,{}, {maxSteps:80});assert.equal(m[type+1],5);assert.equal(m[qty+1],{append:0x15,merge:0x27,cap:0x99}[mode]);assert.equal(m[0x51c1+player],1);}
console.log('OK - two-player item arrays: append, merge and cap');
