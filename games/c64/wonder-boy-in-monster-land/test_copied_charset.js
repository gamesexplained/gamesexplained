'use strict';
const assert=require('assert'),crypto=require('crypto'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,parts=path.join(root,'parts'),base=new Uint8Array(65536),meta=JSON.parse(fs.readFileSync(path.join(root,'copied-charset-observations.json')));for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);assert.deepStrictEqual(meta.loads,Array.from({length:30},(_,i)=>i+2));assert.equal(meta.glyphs.length,4352);
for(const load of meta.loads){
 const p=path.join(parts,`stage-${String(load).padStart(2,'0')}`),m=base.slice(),symbols=JSON.parse(fs.readFileSync(path.join(p,'symbols.json')));for(const r of JSON.parse(fs.readFileSync(path.join(p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);const source=m[0x7f41]|m[0x7f42]<<8,run=m.slice();run[0x52]=source&255;run[0x53]=source>>8;new CPU(run).call(0x717c,{}, {maxSteps:50000});
 for(const o of meta.glyphs.filter(x=>x.load===load)){assert.equal(o.address,source+8*o.glyph);const rows=m.slice(o.address,o.address+8);assert.equal(crypto.createHash('sha256').update(rows).digest('hex'),o.sha256);assert.deepStrictEqual([...run.slice(0xd000+8*o.glyph,0xd008+8*o.glyph)],[...rows]);assert(symbols.comments.some(c=>c.address===o.address&&c.type==='line'));}
}
console.log('OK - copied character rows match source, listings and copy routine');
