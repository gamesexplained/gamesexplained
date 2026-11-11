'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
function probe(a,carry,free){const m=base.slice(),cpu=new CPU(m);m.fill(0,0x4ccf,0x4cef);for(const i of free)m[0x4ccf+i]=255;m[0x08a1]=0;m[0x19a1]=71;m[0x195d]=33;m[0x196e]=1;m[0x0840]=0;cpu.a=a;cpu.x=0;cpu.z=Number(a===0);cpu.n=Number(a>=128);cpu.c=carry;cpu.pc=0x5eaf;cpu.run({until:0x5deb,maxSteps:2000});return m}
for(const [a,c,baseSprite,direction,exit] of [[0,0,0x99,0,255],[0,1,0xa1,255,255],[2,1,0x99,2,0],[255,1,0xa1,255,0]]){const m=probe(a,c,[31,30,29,28]);assert.equal(m[0x4d3a],baseSprite);assert.equal(m[0x4d51],direction);assert.equal(m[0x0840],exit);assert.deepEqual([m[0x4d4c],m[0x4d4b],m[0x4d4e],m[0x4d4d]],[31,30,29,28]);assert.equal(m[0x4d39],71);for(let i=0;i<8;i++){assert.equal(m[0x4d29+i],33);assert.equal(m[0x4d31+i],1);assert.equal(m[0x4d21+i],0)}}
const missing=probe(0,0,[]);assert.deepEqual([missing[0x4d4c],missing[0x4d4b],missing[0x4d4e],missing[0x4d4d]],[255,253,251,249]);
missing[0x4dce]=42;const follow=new CPU(missing);follow.pc=0x1555;follow.run({until:0x15e5,maxSteps:500});assert.equal(missing[0x4d4c],1);assert.equal(missing[0x4dcc],71);
const skipped=probe(1,0,[]);assert.equal(skipped[0x0840],0);
console.log('OK - effect callback flags, sprite-slot selection and controlled out-of-range write match resident code');
