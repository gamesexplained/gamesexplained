'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-routine-observations.json')));let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);const t=o.table;
 for(const [fire,left,right,offset] of [[0,0,0,-0x48f],[1,0,0,-0x4cd],[1,1,0,-0x4af],[1,1,1,-0x503]]){const run=m.slice();run[0x70]=fire;run[0x73]=left;run[0x74]=right;const cpu=new CPU(run);cpu.pc=t-0x4f2;cpu.run({until:t+offset,maxSteps:30});cases++}
 for(const [left,mode,gate,expected,shown,redraw] of [[1,0x80,0,0x80,-1,0],[1,0,0,255,4,1],[1,1,0,0,-1,1],[1,0,1,255,-1,1],[0,1,0,1,-1,0],[0,0,0,1,17,1],[0,255,0,0,-1,1],[0,0,1,1,-1,1]]){
  const run=m.slice(),select=t-0x3c7,draw=t-0x3df;run[t-0x356]=mode;run[t-0x357]=gate;run[t-0x351]=4;run[t-0x350]=17;run[0x10]=255;run[0x11]=0;run.set([0x85,0x10,0x60],select);run.set([0xe6,0x11,0x60],draw);const cpu=new CPU(run);cpu.pc=t+(left?-0x4cd:-0x4af);cpu.run({until:t-0x516,maxSteps:100});assert.equal(run[t-0x356],expected);assert.equal(run[0x10],shown<0?255:shown);assert.equal(run[0x11],redraw);cases++;
 }
}
console.log(`OK - ${cases} controlled shop input and mode-selection paths with display callbacks stubbed`);
