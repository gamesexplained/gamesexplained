'use strict';
const assert=require('assert'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const root=__dirname,m=new Uint8Array(65536),records=JSON.parse(fs.readFileSync(path.join(root,'parts/stage-01/listing.json'))).records;
for(const r of records)if(r.b)m.set(r.b,r.a);
const slots=JSON.parse(fs.readFileSync(path.join(root,'first-sprite-details.json'))).slots;
for(const s of slots){
 assert.equal(s.address,0xc000+s.frame*64);const bytes=m.slice(s.address,s.address+64),bits=[...bytes.slice(0,63)].reduce((n,v)=>n+v.toString(2).replace(/0/g,'').length,0),rows=[];
 for(let i=0;i<21;i++)if(bytes[i*3]||bytes[i*3+1]||bytes[i*3+2])rows.push(i);
 assert.equal(bits,s.set_bits);assert.equal(rows.length?rows[0]:null,s.first_row);assert.equal(rows.length?rows[rows.length-1]:null,s.last_row);assert.equal(bytes[63],s.slot_byte);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),s.sha256);
 const record=records.find(r=>r.a===s.address);assert(record&&record.c&&record.c.includes(`sprite slot $${s.frame.toString(16).toUpperCase().padStart(2,'0')}`));
}
console.log(`OK - ${slots.length} first-load sprite slot details match the listing`);
