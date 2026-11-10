'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const a=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)a.set(r.b,r.a);
for(const [addr,value] of [[0x7fa0,0x34],[0x7fa7,0x12],[0x7f84,0x78],[0x7f8b,0x56],[0x7f92,0xbc],[0x7f99,0x9a],[0x7fae,0],[0x7fb5,0x60],[0x7fbc,6],[0x7fc3,7],[0x7fca,8]])a[addr]=value;
const source=Array.from({length:2048},(_,i)=>(i*17+(i>>8))&255);a.set(source,0x6000);a[0x46]=0xc4;a.fill(0,0x300,0x306);const stub=[];[0x6c,0x6d,0x5a,0x5b,0x52,0x53].forEach((zp,i)=>stub.push(0xa5,zp,0x8d,i,3));stub.push(0x60);a.set(stub,0x7008);a.set([0xa2,2,0x20,0x30,0x71,0xea],0x2f0);
const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:30000});assert.equal(cpu.pc,0x2f5);assert.deepStrictEqual([...a.slice(0xd000,0xd800)],source);assert.deepStrictEqual([...a.slice(0x300,0x306)],[0x34,0x12,0x78,0x56,0xbc,0x9a]);assert.deepStrictEqual([...a.slice(0x4d69,0x4d6b)],[0,4]);assert.equal(a[0x6f],6);assert.deepStrictEqual([...a.slice(0x529c,0x529e)],[7,8]);assert.equal(a[0x46],0xc0);assert.equal(a[0x7188],0xd0);assert.equal(a[1],0x35);
console.log('OK - resident screen-resource pointer selection and copy');
