'use strict';
// Run the real copy routines against every later-load record in the listings.
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),memory=new Uint8Array(65536);
function layer(file){for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)memory.set(r.b,r.a);}
layer(path.join(parts,'resident/listing.json'));
const six=[0x485f,0x486f,0x487f,0x48af,0x488f,0x489f],twelve=[0x4747,0x474d,0x4759,0x4753,0x476b,0x4771,0x4777,0x477d,0x4783,0x4789,0x475f,0x4765];let sixCount=0,objectCount=0;
for(let n=1;n<=31;n++){
 const dir=path.join(parts,`stage-${String(n).padStart(2,'0')}`);layer(path.join(dir,'listing.json'));if(n===1)continue;
 const m=memory.slice(),symbols=JSON.parse(fs.readFileSync(path.join(dir,'symbols.json'))),ptr6=m[0x7f52]|m[0x7f53]<<8,count6=m[0x7f54],ptr16=m[0x7f55]|m[0x7f56]<<8,count16=m[0x7f57];
 assert(count6>0&&count6<=16&&count16<=6,`load ${n}: captured counts`);
 for(const [a,end,type] of [[0x7f52,0x7f53,'Word'],[0x7f54,0x7f54,'Byte'],[0x7f55,0x7f56,'Word'],[0x7f57,0x7f57,'Byte']]){const b=symbols.blocks.find(b=>b.start===a);assert(b&&b.end===end&&b.type===type,`load ${n}: header ${a.toString(16)}`);}
 const rows6=Array.from({length:count6},(_,i)=>[...m.slice(ptr6+i*6,ptr6+i*6+6)]),rows16=Array.from({length:count16},(_,i)=>[...m.slice(ptr16+i*16,ptr16+i*16+16)]);
 function checkRows(rows,start,size,prefix){for(let i=0;i<rows.length;i++){
  const a=start+i*size,b=symbols.blocks.find(b=>b.start===a),label=symbols.symbols.find(s=>s.address===a),c=symbols.comments.find(c=>c.address===a&&c.type==='line');
  assert(b&&b.type==='Byte'&&b.end===a+size-1,`load ${n}: block`);assert(label&&label.name===`${prefix}_${String(i+1).padStart(2,'0')}`);
  const bytes=rows[i].map(v=>`$${v.toString(16).toUpperCase().padStart(2,'0')}`).join(', ');assert(c&&c.text.includes(`initial bytes ${bytes}`),`load ${n}: field description`);
  if(size===6){const addr=rows[i][4]|rows[i][5]<<8;assert(c.text.includes(`callback address is $${addr.toString(16).toUpperCase().padStart(4,'0')}`));}
 }}
 checkRows(rows6,ptr6,6,'load_trigger_record');checkRows(rows16,ptr16,16,'load_stage_object_record');
 new CPU(m).call(0x7979);for(let i=0;i<count6;i++)assert.deepEqual(six.map(a=>m[a+i]),rows6[i],`load ${n}: trigger copy ${i+1}`);
 // Stub the map-writing callee so record decoding can be checked without modifying other data.
 const before=twelve.map(a=>m[a]);m[0x46d6]=0x60;new CPU(m).call(0x4655);
 for(let i=0;i<count16;i++)assert.deepEqual(twelve.map(a=>m[a+i]),rows16[i].slice(0,12),`load ${n}: object copy ${i+1}`);
 if(count16)assert.deepEqual([...m.slice(0x7d,0x81)],rows16[count16-1].slice(12));else assert.deepEqual(twelve.map(a=>m[a]),before,`load ${n}: zero count`);
 sixCount+=count6;objectCount+=count16;
}
assert.equal(sixCount,112);assert.equal(objectCount,55);console.log(`OK - ${sixCount} trigger and ${objectCount} object records match the copy routines`);
