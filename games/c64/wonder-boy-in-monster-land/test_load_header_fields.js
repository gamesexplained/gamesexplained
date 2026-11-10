'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,parts=path.join(root,'parts'),base=new Uint8Array(65536),meta=JSON.parse(fs.readFileSync(path.join(root,'load-header-observations.json')));for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);assert.equal(meta.schema,1);assert.equal(meta.loads.length,30);
for(const row of meta.loads){
 const p=path.join(parts,`stage-${String(row.load).padStart(2,'0')}`),m=base.slice(),symbols=JSON.parse(fs.readFileSync(path.join(p,'symbols.json')));for(const r of JSON.parse(fs.readFileSync(path.join(p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);assert.deepStrictEqual([...m.slice(0x7f58,0x7f82)],row.bytes);for(const address of [0x7f58,0x7f5e,0x7f64,0x7f6d,0x7f75,0x7f81])assert(symbols.comments.some(c=>c.address===address&&c.type==='line'));
 const a=m.slice(),cpu=new CPU(a);cpu.pc=0x2256;cpu.run({until:0x227a,maxSteps:30});assert.equal(cpu.pc,0x227a);assert.deepStrictEqual([...a.slice(0x2227,0x2229),...a.slice(0x222e,0x2230),...a.slice(0x2235,0x2237)],row.bytes.slice(0,6));const b=m.slice(),selector=new CPU(b);selector.pc=0x06a1;selector.run({until:0x06a4,maxSteps:5});assert.equal(selector.pc,0x06a4);assert.equal(selector.x,row.bytes[41]);
}
console.log('OK - captured load headers match sound and selector reads');
