'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const timer of [0,1,2]){const a=m.slice();a[0x98c3]=timer;a[0x98c4]=5;a[0x19c4]=0xf0;a[0x1ab2]=4;new CPU(a).call(0x987a,{x:1});if(!timer){assert.equal(a[0x1ab2],5);assert.equal(a[0x19e6],0xcd);assert.equal(a[0x1a6e],0x7d);assert.equal(a[0x19f7],15);assert.equal(a[0x1a19],15)}else{const first=timer&1?(0xf0-24)&255:(0xf0+24)&255,second=(first+2+(!(timer&1)&&0xf0+24>255?1:0))&255;assert.equal(a[0x98c3],timer-1);assert.equal(a[0x19c4],first);assert.equal(a[0x19d5],second)}}
console.log('OK - load-31 type-$2D/$2E state 4 and frame carry');
