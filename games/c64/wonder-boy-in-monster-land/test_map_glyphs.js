'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const observations=JSON.parse(fs.readFileSync(path.join(__dirname,'map-glyph-observations.json')));let count=0;
for(const load of [...new Set(observations.map(o=>o.load))]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 const source=m[0x7f41]|m[0x7f42]<<8,width=m[0x7f4b],height=m[0x7f4c],stride=m[0x7f4a],counts=new Map();for(let y=0;y<height;y++)for(let x=0;x<width;x++){const t=m[0x8671+y*stride+x];counts.set(t,(counts.get(t)||0)+1)}
 const run=m.slice();run[0x52]=source&255;run[0x53]=source>>8;new CPU(run).call(0x717c,{}, {maxSteps:50000});
 for(const o of observations.filter(x=>x.load===load)){
  assert.equal(o.address,source+o.glyph*8);const rows=[...m.slice(o.address,o.address+8)];assert(rows.every(x=>[0,0x55,0xaa,0xff].includes(x)));assert.deepEqual([...run.slice(0xd000+o.glyph*8,0xd008+o.glyph*8)],rows,`load ${load} glyph ${o.glyph}`);
  const expected=[];for(const [tile,n] of [...counts.entries()].sort((a,b)=>a[0]-b[0]))for(const [quadrant,table] of [0x81cf,0x82cf,0x83cf,0x84cf].entries())if(m[table+tile]===o.glyph)expected.push([tile,quadrant,n]);assert.deepEqual(o.uses,expected);assert(expected.length>0);count++;
 }
}
console.log(`OK - ${count} simple glyphs are copied and referenced by captured map cells`);
