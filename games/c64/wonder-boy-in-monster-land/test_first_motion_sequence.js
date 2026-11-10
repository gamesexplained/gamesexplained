'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const m=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
m[0x1ab1]=m[0x1ac2]=m[0x1ad3]=0;const cpu=new CPU(m),got=[];for(let i=0;i<45;i++){cpu.call(0x9241,{x:0},{maxSteps:100});got.push(cpu.a);}
const expected=[255,255,0,1,1,2,2,...Array(13).fill(3),2,2,1,1,0,255,255,254,254,...Array(13).fill(253),254,254,255];assert.deepEqual(got,expected);
console.log('OK - first-load repeating motion sequence and reset');
