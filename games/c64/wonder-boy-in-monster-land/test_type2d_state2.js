'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const [direction,effect] of [[0,0],[128,0],[0,1],[128,1]]){const a=m.slice();a[0x1b29]=direction;a[0x1a90]=effect;a[0x1b18]=4;a[0x1ab2]=2;a.fill(0,0x10,0x13);a.set([0xe6,0x12,0x60],0x9820);a.set([0xe6,0x10,0x60],0x43f0);a.set([0xe6,0x11,0x60],0x43a2);new CPU(a).call(0x9749,{x:1});assert.deepEqual([...a.slice(0x10,0x13)],direction?[1,0,1]:[0,1,1]);assert.equal(a[0x1ab2],effect?2:4)}
console.log('OK - load-31 type-$2D/$2E state 2');
