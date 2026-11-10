'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');const m=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)m.set(r.b,r.a);const shapes=JSON.parse(fs.readFileSync(path.join(__dirname,'resident-sprite-shapes.json')));assert.equal(shapes.length,29);assert.equal(new Set(shapes.map(s=>s.address)).size,29);
for(const s of shapes){assert.equal(s.address,0xc000+s.slot*64);let bits=0,rows=0;for(let y=0;y<21;y++){let occupied=false;for(let x=0;x<24;x++){const set=(m[s.address+y*3+(x>>3)]>>(7-(x&7)))&1;bits+=set;occupied ||= Boolean(set);}rows+=occupied;}assert.equal(bits,s.set_bits);assert.equal(rows,s.nonempty_rows);}
console.log('OK - 29 resident sprite bitmap geometries');
