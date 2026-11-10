'use strict';
const assert=require('assert'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const root=__dirname,m=new Uint8Array(65536),records=JSON.parse(fs.readFileSync(path.join(root,'parts/resident/listing.json'))).records;for(const r of records)if(r.b)m.set(r.b,r.a);
const glyphs=JSON.parse(fs.readFileSync(path.join(root,'resident-charset-details.json'))).glyphs;
for(const g of glyphs){const b=m.slice(g.address,g.address+8);assert.equal(g.address,0xc800+g.glyph*8);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),g.sha256);assert.equal([...b].reduce((n,v)=>n+v.toString(2).replace(/0/g,'').length,0),g.set_bits);const rows=[...b].flatMap((v,i)=>v?[i]:[]);assert.equal(rows.length?rows[0]:null,g.first_row);assert.equal(rows.length?rows[rows.length-1]:null,g.last_row);const r=records.find(x=>x.a===g.address);assert(r&&r.c&&r.c.includes(`character $${g.glyph.toString(16).toUpperCase().padStart(2,'0')}`));}
console.log(`OK - ${glyphs.length} resident character patterns match listing bytes`);
