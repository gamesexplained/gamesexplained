'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const [start,low,high] of [[0x9820,8,20],[0x983e,4,16],[0x985c,0,12]])for(const carry of [0,1]){const a=m.slice();a[0x19e6]=0xf8;a.set([0xa9,0x40,carry?0x38:0x18,0x60],0x72fc);new CPU(a).call(start,{x:1});const first=(0xf8+(carry?high:low))&255;assert.equal(a[0x98be],carry?0xa0:0x20);assert.equal(a[0x19c4],first);assert.equal(a[0x19d5],(first+2)&255)}
console.log('OK - load-31 type-$2D/$2E frame helpers');
