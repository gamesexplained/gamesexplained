'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const mem=new Uint8Array(65536);for(const part of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)mem.set(r.b,r.a);
const src=mem.slice(0xb5c4,0xbdc4);assert.equal(crypto.createHash('sha256').update(src.slice(0,0x4c0)).digest('hex'),'57860d06933ce6fe3afac48089e97add6f80c0c3fc8aebb8f6f2f5d2588972b5');
mem[0x52]=0xc4;mem[0x53]=0xb5;mem.fill(0,0xd000,0xd800);const cpu=new CPU(mem);cpu.call(0x717c);
assert.deepEqual(mem.slice(0xd000,0xd800),src);assert.equal(mem[1],0x35);assert.equal(mem[0x7188],0xd0);
console.log('OK - title source matches the captured RAM copy and all eight pages copy');
