'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,start] of [[9,0x9fbb],[19,0xa278],[20,0x9d75],[30,0xaf7c]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);m[0x46]=0xc0;m.fill(0xaa,0xc195,0xc199);
 const cpu=new CPU(m);cpu.pc=start;cpu.p&=~8;cpu.run({until:start+0x24,maxSteps:120});assert.equal(cpu.pc,start+0x24);assert.equal(m[0x2c15],7);assert.equal(m[0x4d6a],0);assert.equal(m[start+0x141],0xc1);assert.deepEqual([...m.slice(0xc195,0xc199)],[0,0,0xf6,0]);assert.deepEqual([...m.slice(0xd995,0xd999)],[1,1,1,1]);
}
console.log('OK - four later-load display setup paths and character writes');
