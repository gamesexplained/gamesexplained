'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [entry,offset,tile,rows] of [[0xab56,0x20,0x31,4],[0xab63,0x20,0x72,3],[0xab68,0x20,0x66,3],[0xab6d,0x20,0x5a,3],[0xab72,0x20,0x7e,4]]){
 const m=base.slice();m[0x46]=0xc0;m[0x7b]=0;m[0x4777]=0x31;const start=0xc000+(offset+(rows===3?40:0));const cpu=new CPU(m);cpu.call(entry,{a:offset},{maxSteps:1000});
 for(let y=0;y<rows;y++)for(let x=0;x<4;x++)assert.equal(m[start+y*40+x],(tile+y*4+x)&255);
 assert.equal(m[0xaba0],0);
}
console.log('OK - first-load record drawing, including 3- and 4-row entries');
