'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const x of [0,4]){
 const m=base.slice(),cpu=new CPU(m);cpu.pc=0x92fb;cpu.x=x;cpu.run({until:0x77e0,maxSteps:40});assert.equal(cpu.pc,0x77e0);
 for(const [a,v] of [[0x1919,3],[0x19e5,0xd5],[0x1a6d,4],[0x19f6,12],[0x1a18,9],[0x1aa0,7],[0x1a7e,0],[0x192a,1],[0x19b2,1],[0x196e,0],[0x195d,0xd2],[0x19a1,0x78]])assert.equal(m[a+x],v);
 assert.equal(cpu.x|cpu.y<<8,0x933c);
}
console.log('OK - first-load message entity initialization');
