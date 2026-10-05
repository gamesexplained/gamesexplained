// Controlled calls against the published source: node games/c64/neverending-story/reference/review-checks.js
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {CPU}=require(path.resolve(__dirname,'../../../../kit/c64/cpu6502.js'));
const listing=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../parts/part-1/listing.json')));
const image=new Uint8Array(65536);
for(const r of listing.records)if(r.b)image.set(r.b,r.a);
const cpu=new CPU(image.slice()); const calls=[];
const hooks={};for(const a of [0xff84,0xff90,0x7e8,0x96a1,0x96da])
 hooks[a]=c=>{calls.push(a);c.rts();};
cpu.m[0xdc0e]=0xff;cpu.m[0xdd00]=0xff;
for(let a=2;a<256;a++)cpu.m[a]=a;
const before=cpu.m.slice(2,256);cpu.call(0x69b,{}, {hooks});
assert.deepEqual(calls,[0xff84,0xff90,0x7e8,0x96a1,0x96da]);
assert.deepEqual(cpu.m.slice(0xa002,0xa100),before);
assert.equal(cpu.m[0x314]+256*cpu.m[0x315],0xa880);
for(const [a,v]of [[0xdc0e,0xfe],[0xd01a,0xf1],[0xd012,0x33],[0xdd00,0xfc],
                  [0xd018,0x3e],[0xd011,0x1b],[0xd016,0xc8],[1,0x36]])assert.equal(cpu.m[a],v);
assert.equal(cpu.i,0);
const intro=new CPU(image.slice());const printed=[];const introCalls=[];
intro.call(0x1580,{}, {hooks:{
 0xadb:c=>{printed.push({pointer:c.m[0x22]+256*c.m[0x23],length:c.m[0x25]});c.rts();},
 0x552:c=>{introCalls.push(0x552);c.rts();},
 0x96a1:c=>{introCalls.push(0x96a1);c.rts();},
 0x70f:c=>{introCalls.push(0x70f);c.rts();},
}});
assert.deepEqual(printed,[{pointer:image[0xb780]+256*image[0xb781],length:image[0xb784]},
                          {pointer:image[0xb782]+256*image[0xb783],length:image[0xb785]}]);
assert.deepEqual(introCalls,[0x552,0x96a1,0x70f]);
assert.equal(intro.m[0xcfc0],0x5e);assert.equal(intro.m[0xcfe7],0x5f);
assert.equal(intro.m[0xdbc0],0x0b);assert.equal(intro.m[0xdbe7],0x0b);
const irq=new CPU(image.slice());let musicPort,exitPort;
irq.pc=0xa880;irq.run({hooks:{0x9695:c=>{musicPort=c.m[1];c.rts();},
                             0xea81:c=>{exitPort=c.m[1];return true;}}});
assert.equal(musicPort,0x35);assert.equal(exitPort,0x36);assert.equal(irq.m[0xd019],1);
let ground=0;
for(let row=0;row<4;row++) {
 const base=0xb000+row*40;
 for(let cell=0;cell<4;cell++) {
  assert.equal(image[base+36+cell]&15,15);
  for(let scan=0;scan<8;scan++)for(const shift of [0,2,4,6])
   ground+=((image[base+cell*8+scan]>>shift)&3)===3 ? 1 : 0;
 }
}
assert.equal(ground,338);
console.log('Startup, narrative transition, temporary IRQ and all 338 light-grey ground pixels passed');
