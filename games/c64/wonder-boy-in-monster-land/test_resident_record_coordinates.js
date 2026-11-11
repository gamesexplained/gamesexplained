'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const cases=[[0,0],[1,1],[15,11],[16,16],[255,255]];let seed=7;for(let i=0;i<1024;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;cases.push([seed>>>24,(seed>>>16)&255]);}
for(const [column,row] of cases){const a=base.slice();a[0x4861]=column;a[0x4871]=row;a.set([0xa2,2,0x20,0x2c,0x5d,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:80});assert.equal(cpu.pc,0x2f5);const x=column*16+27,y=row*16+89;assert.equal(a[0x194c],x&255);assert.equal(a[0x193b],x>>8);assert.equal(a[0x1990],y&255);assert.equal(a[0x197f],y>>8);}
console.log('OK - resident record-coordinate conversion');
