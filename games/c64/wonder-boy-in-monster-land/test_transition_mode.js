'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const count of [1,2,3]){
 const m=base.slice();m[0xd012]=0;m[0xdd00]=0x40;m[1]=0x35;
 m[0x7e44]=0x60;m[0x7da6]=0x60;m[0x7dc4]=0x60; // handshake and receive stubs
 m.set([0xee,0xe0,2,0x38,0x60],0x7c2c);m[0x2e0]=0; // count decoder calls
 const cpu=new CPU(m);cpu.call(0x7d1b,{a:3,x:0,y:count},{maxSteps:10000});
 assert.equal(m[0x2e0],count);assert.equal(m[0x61],0);assert.equal(m[0x7d73]|m[0x7d74]<<8,0x7c2c);
 assert.equal(cpu.c,1);assert.equal(m[1],0x35);assert.equal(m[0xdd00],0x40);
}
console.log('OK - transfer mode 0 selects the decoder and calls it the requested number of times with I/O stubs');
