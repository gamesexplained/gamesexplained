'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,base=new Uint8Array(65536),shops=JSON.parse(fs.readFileSync(path.join(root,'shop-routine-observations.json')));
for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const shop of shops){const original=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',`stage-${String(shop.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)original.set(r.b,r.a);const t=shop.table,held=t-0x3f2,cursor=t-0x3df;
 for(const [left,right,fire,expected] of [[1,1,1,false],[0,1,1,true],[1,0,1,true],[1,1,0,true],[0,0,0,true]]){const m=original.slice();m[0x73]=left;m[0x74]=right;m[0x70]=fire;m[0x3c4c]=0x60;const cpu=new CPU(m);cpu.call(held,{}, {maxSteps:30});assert.equal(Boolean(cpu.p&1),expected);}
 for(const [mode,pos] of [[255,0x12],[0,0x34],[1,0x56]]){const m=original.slice();m[t-0x356]=mode;m.set([0x12,0x34,0x56],t-0x355);const cpu=new CPU(m);cpu.pc=cursor;cpu.p&=~8;cpu.run({until:0x719e,maxSteps:20});assert.equal(cpu.pc,0x719e);assert.equal(cpu.x,pos);assert.equal(cpu.y,0x82);}
}
assert.equal(shops.length,17);console.log('OK - 17 later-load shop input and cursor helpers');
