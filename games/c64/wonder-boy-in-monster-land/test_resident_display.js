'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [effect,flag,typ,override] of [[0,0,1,0],[0,1,1,0],[0,1,255,0],[0,1,1,1],[255,1,1,0],[254,1,1,0],[3,1,1,0],[1,1,1,0]]){
 const a=base.slice();for(const [addr,v] of [[0x1a2a,20],[0x1a3b,21],[0x1a4c,22],[0x1a5d,23],[0x192b,flag],[0x191a,typ],[0x1a90,effect],[0x1aa1,override],[0x19c4,0x40],[0x19d5,0x50],[0x19f7,6],[0x1a08,9],[0x1a19,12],[0x1dc4,12],[0x1dc5,34],[0x1dc6,56]])a[addr]=v;
 for(const z of [0x4c2f,0x4c4f,0x4c6f,0x4c8f,0x4caf,0x4ccf,0x4cef])a.fill(99,z+20,z+24);
 const palette=a[0x1fba+(effect&&!(effect&128)?effect-1:0)],cpu=new CPU(a);cpu.pc=0x1c7c;cpu.x=1;cpu.run({until:0x1b62,maxSteps:300});const after=effect&128?effect^1:effect?effect-1:0,hidden=!!(after&128&&after&1),secondary=(flag&1)&&typ!==255;assert.equal(cpu.pc,0x1b62);assert.equal(a[0x1a90],after);
 for(let i=0;i<4;i++){if(i>=2&&!secondary){assert.equal(a[0x4c8f+20+i],99);continue;}assert.equal(a[0x4c8f+20+i],[0x41,0x40,0x51,0x50][i]);assert.equal(a[0x4ccf+20+i],hidden?254:56+(i>=2?21:0));assert.equal(a[0x4c2f+20+i],i===0||i===2?1:0);const colour=i===0?6:i===2?12:effect&&!(effect&128)&&(i===1||effect>1)?palette:override?7:9;assert.equal(a[0x4caf+20+i],colour);}
}
console.log('OK - resident display pairs, blink and palette cases');
