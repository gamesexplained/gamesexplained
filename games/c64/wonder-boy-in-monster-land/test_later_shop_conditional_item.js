'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,base=new Uint8Array(65536),shops=JSON.parse(fs.readFileSync(path.join(root,'shop-routine-observations.json')));
for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const shop of shops){const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',`stage-${String(shop.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);for(const [input,flags,expected] of [[7,0,7],[0x13,0,0x13],[0x13,0x10,0x14]]){const m=original.slice();m[0x4dbd]=0;m[0x4de2]=flags;const cpu=new CPU(m);cpu.call(shop.table-0x407,{a:input},{maxSteps:30});assert.equal(cpu.a,expected);}}
assert.equal(shops.length,17);console.log('OK - 17 later-load conditional item resolvers');
