'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
assert.deepEqual([...base.slice(0xcb00,0xcb08)],[0,0,254,254,254,124,56,16], 'glyph $60 bitmap');
const observations=JSON.parse(fs.readFileSync(path.join(__dirname,'dialogue-observations.json')));let count=0;
for(const o of observations){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 let cursor=o.address;const lines=[];for(const length of o.lengths){const line=[...m.slice(cursor,cursor+length)];assert.equal(m[cursor+length],0);lines.push(line);cursor+=length+1}assert.equal(cursor,o.end);assert.equal(m[cursor],o.control);
 for(const call of o.calls){const run=m.slice(),cpu=new CPU(run);cpu.pc=call;cpu.run({until:0x77e0,maxSteps:10});assert.equal(cpu.x|cpu.y<<8,o.address,`load ${o.load} candidate ${call.toString(16)}`)}
 const run=m.slice();run[0x77e1]=0;const cpu=new CPU(run);cpu.pc=0x77e0;cpu.x=o.address&255;cpu.y=o.address>>8;cpu.run({until:0x7842,maxSteps:2000});
 for(let i=0;i<3;i++){const start=[0x4efb,0x4f11,0x4f27][i];const expected=lines[i].map(b=>b===0x20?0:b);assert.deepEqual([...run.slice(start,start+expected.length)],expected,`load ${o.load} record ${o.address.toString(16)} line ${i}`);assert([...run.slice(start+expected.length,start+20)].every(b=>b===0));}
 count++;
}
console.log(`OK - ${count} candidate records load their pointers and copy three lines in the listing simulator`);
