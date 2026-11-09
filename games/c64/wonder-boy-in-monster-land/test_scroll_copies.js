'use strict';
// Exercise every entry point of the unrolled scroll-copy routines from the listing.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const listing = JSON.parse(fs.readFileSync(path.join(__dirname, 'parts/resident/listing.json')));
const base = new Uint8Array(65536);
for (const record of listing.records) if (record.b) base.set(record.b, record.a);
for (const [entry, count, direction] of [[0x61d8,39,1],[0x61dd,38,1],[0x629c,38,-1]]) {
  const mem = base.slice();
  for (let i = 0; i < 256; i++) { mem[0x4000+i] = (i*37+11)&255; mem[0x5000+i] = 0xa5; }
  mem[0x54]=0; mem[0x55]=0x40; mem[0x52]=0; mem[0x53]=0x50;
  const initialY=0xfa, expected=mem.slice(0x5000,0x5100);
  for (let i=0; i<count; i++) { const offset=(initialY+direction*i)&255; expected[offset]=mem[0x4000+offset]; }
  const cpu=new CPU(mem);cpu.call(entry,{y:initialY});
  assert.deepEqual(mem.slice(0x5000,0x5100),expected,`entry ${entry.toString(16)} bytes`);
  assert.equal(cpu.y,(initialY+direction*count)&255,`entry ${entry.toString(16)} Y`);
}
for (const [entry,first,last] of [[0x635b,0xd8c8,0xd8ed],[0x6440,0xd9e0,0xda05],[0x6525,0xdaf8,0xdb1d],[0x660a,0xd8ee,0xd8c8],[0x6610,0xd8ed,0xd8c8],[0x66f5,0xda06,0xd9e0],[0x66fb,0xda05,0xd9e0],[0x67e0,0xdb1e,0xdaf8],[0x67e6,0xdb1d,0xdaf8]]) {
  const mem=base.slice();for(let a=0xd800;a<0xdc00;a++)mem[a]=(a*37+11)&255;
  const expected=mem.slice(), step=first<last?1:-1, x=1, y=0;
  for(let a=first;;a+=step){expected[a+y]=expected[a+x];if(a===last)break;}
  const cpu=new CPU(mem);cpu.call(entry,{x,y});
  assert.deepEqual(mem.slice(0xd800,0xdc00),expected.slice(0xd800,0xdc00),`entry ${entry.toString(16)} bytes`);
  assert.equal(cpu.x,x);assert.equal(cpu.y,y);
}
console.log('OK - twelve scroll-copy entries match their documented byte order and lengths');
