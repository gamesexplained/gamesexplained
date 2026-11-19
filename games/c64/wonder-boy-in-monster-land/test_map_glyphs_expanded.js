'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
function drawn(clause){const out=new Set();for(const m of clause.matchAll(/\$([0-9A-F]{2})(?:–\$([0-9A-F]{2}))?/g)){const a=parseInt(m[1],16),b=parseInt(m[2]||m[1],16);for(let g=a;g<=b;g++)out.add(g)}return out}
const observations=JSON.parse(fs.readFileSync(path.join(__dirname,'map-glyph-expanded.json')));let count=0;
for(const load of [...new Set(observations.map(o=>o.load))]){
 const dir=path.join(parts,`stage-${String(load).padStart(2,'0')}`),listing=JSON.parse(fs.readFileSync(path.join(dir,'listing.json'))),symbols=JSON.parse(fs.readFileSync(path.join(dir,'symbols.json'))),m=base.slice(),code=new Set();
 for(const r of listing.records){if(r.b)m.set(r.b,r.a);if(r.t==='code')for(let i=0;i<(r.b||[]).length;i++)code.add(r.a+i)}
 const source=m[0x7f41]|m[0x7f42]<<8,width=m[0x7f4b],height=m[0x7f4c],stride=m[0x7f4a],counts=new Map();
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const t=m[0x8671+y*stride+x];counts.set(t,(counts.get(t)||0)+1)}
 const notes=symbols.comments.filter(x=>x.type==='line').sort((a,b)=>a.address-b.address);const run=m.slice();run[0x52]=source&255;run[0x53]=source>>8;new CPU(run).call(0x717c,{}, {maxSteps:50000});
 for(const o of observations.filter(x=>x.load===load)){
  assert.equal(o.address,source+o.glyph*8);const rows=[...m.slice(o.address,o.address+8)];
  assert.deepEqual([...run.slice(0xd000+o.glyph*8,0xd008+o.glyph*8)],rows);
  for(let a=o.address;a<o.address+8;a++)assert(!code.has(a),`load ${load} glyph ${o.glyph} overlaps known code`);
  const expected=[];for(const [tile,n] of [...counts.entries()].sort((a,b)=>a[0]-b[0]))for(const [quadrant,table] of [0x81cf,0x82cf,0x83cf,0x84cf].entries())if(m[table+tile]===o.glyph)expected.push([tile,quadrant,n]);
  assert.deepEqual(o.uses,expected);assert(expected.length>0);
  // the glyph lies in a run of the map's character set whose note says the map's tiles draw it
  const c=notes.filter(x=>x.address<=o.address).at(-1),src=source.toString(16).toUpperCase().padStart(4,'0');
  assert(c&&c.text.includes(`of the map's character set, the eight-page copy that starts at $${src}`),`load ${load} glyph ${o.glyph}`);
  const at=c.text.indexOf("The map's tiles draw ");assert(at>=0,`load ${load} glyph ${o.glyph}: tiles`);const clause=c.text.slice(at).split('.')[0];
  assert(clause.includes('every one of them')||drawn(clause).has(o.glyph),`load ${load} glyph ${o.glyph}: named`);count++;
 }
}
console.log(`OK - ${count} additional map glyphs match the loader, map references and listing descriptions`);
