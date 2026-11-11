'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const [a,v] of [[0x4c73,0x74],[0x4c74,0x74],[0x4cd3,0xc8],[0x4cd4,0xc8],[0x9a0f,0],[0x9a10,8],[0x79,0],[0xd012,0x80]])m[a]=v;const cpu=new CPU(m);cpu.pc=0x9934;cpu.run({until:0x9972,maxSteps:10000});
for(const [a,v] of [[0x4c73,0x50],[0x4c74,0x50],[0x4cd3,0x4f],[0x4cd4,0x4f],[0x9a0f,2],[0x9a10,0],[0x79,0]])assert.equal(m[a],v);
console.log('OK - load-31 type-$2D/$2E raster motion with fixed $D012');
