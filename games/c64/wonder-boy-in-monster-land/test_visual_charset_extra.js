'use strict';
const assert=require('assert'),crypto=require('crypto'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,items=JSON.parse(fs.readFileSync(path.join(root,'visual-charset-observations.json'))).glyphs,base=new Uint8Array(65536),groups=new Map();
for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const x of items){const k=x.load+':'+x.selector;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
for(const group of groups.values()){
 const x=group[0],m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',`stage-${String(x.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 const original=m.slice();assert.equal(original[0x7fac+x.selector]+256*original[0x7fb3+x.selector],x.source);
 m[0x46]=0xc4;m[0x4d71]=0xc8;m[0x4d8a]=0;new CPU(m).call(0x7119,{x:x.selector},{maxSteps:500000});
 for(const v of group){const rows=original.slice(v.address,v.address+8);assert.equal(v.address,v.source+v.glyph*8);assert.equal(crypto.createHash('sha256').update(rows).digest('hex'),v.sha256);assert.deepEqual(m.slice(0xd000+v.glyph*8,0xd008+v.glyph*8),rows,`${v.load}/${v.selector}/${v.glyph}`);}
}
console.log(`OK - ${items.length} copied visual patterns in ${groups.size} controlled selections`);
