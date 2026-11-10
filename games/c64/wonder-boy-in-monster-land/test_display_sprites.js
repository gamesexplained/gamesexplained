'use strict';
// Validate captured display-slot observations against listings and the game's pointer writer.
const assert=require('assert'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,parts=path.join(root,'parts'),observations=JSON.parse(fs.readFileSync(path.join(root,'display-observations.json')));assert.equal(observations.probe_frames,200);
const resident=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)resident.set(r.b,r.a);
let total=0;
for(const capture of observations.loads){
 const n=capture.stage,dir=path.join(parts,`stage-${String(n).padStart(2,'0')}`),mem=resident.slice(),seen=new Uint8Array(65536),symbols=JSON.parse(fs.readFileSync(path.join(dir,'symbols.json')));
 for(const r of JSON.parse(fs.readFileSync(path.join(dir,'listing.json'))).records)if(r.b){mem.set(r.b,r.a);seen.fill(1,r.a,r.a+r.b.length);}
 for(const sprite of capture.slots){
  if(sprite.first_frame!==undefined){assert(sprite.first_frame>=0&&sprite.first_frame<=200&&sprite.first_frame%10===0);assert.equal(sprite.executions,0);}
  const a=0xc000+64*sprite.pointer;assert.equal(a,sprite.address);assert(seen.slice(a,a+63).every(Boolean));
  assert.equal(crypto.createHash('sha256').update(mem.slice(a,a+63)).digest('hex'),sprite.hash,`load ${n} slot ${sprite.pointer.toString(16)} bytes`);
  const block=symbols.blocks.find(b=>b.start===a);assert(block&&block.type==='Byte'&&block.end===a+62,`load ${n} bitmap extent`);
  const comment=symbols.comments.find(c=>c.address===a&&c.type==='line');assert(comment,`load ${n} bitmap description`);
  if(n!==2){assert(comment.text.includes(`pointer $${sprite.pointer.toString(16).toUpperCase()}`));for(const d of sprite.display)assert(comment.text.includes(`slot ${d.index} (Y=$${d.y.toString(16).toUpperCase().padStart(2,'0')})`));}
  for(const d of sprite.display){
   assert(d.index>=0&&d.index<32&&d.y<0xfe&&d.flags>=0&&d.flags<256&&d.colour>=0&&d.colour<256);
   const m=mem.slice();m[0x4c8f+d.index]=sprite.pointer;const cpu=new CPU(m);cpu.x=3;cpu.y=d.index;cpu.pc=0x1744;cpu.run({until:0x174d,maxSteps:10});
   assert.equal(m[0xc3fb],sprite.pointer);assert.equal(m[0xc7fb],sprite.pointer);
  }
  total++;
 }
}
assert.equal(total,158);assert.equal(observations.loads.flatMap(x=>x.slots).filter(x=>x.input_sequence==='right-fire-up').length,16);
const html=fs.readFileSync(path.join(root,'graphics.html'),'utf8'),match=html.match(/<script id="observed-sprites-data" type="application\/json">([^<]+)<\/script>/);assert(match,'observed sprite gallery data');
const frames=JSON.parse(match[1]).filter(f=>f.sequence!=='record');assert.equal(frames.length,total);
for(const capture of observations.loads)for(const sprite of capture.slots){
 const frame=frames.find(f=>f.load===capture.stage&&f.pointer===sprite.pointer),sample=sprite.display[0];assert(frame,`load ${capture.stage} gallery slot`);
 assert.equal(crypto.createHash('sha256').update(Uint8Array.from(frame.pixels)).digest('hex'),sprite.hash);
 assert.equal(frame.multicolour,!!(sample.flags&1));assert.equal(frame.colour,sample.colour&15);assert.equal(frame.displaySlot,sample.index);assert.equal(frame.y,sample.y);assert.equal(frame.frame,sprite.first_frame||0);assert.equal(frame.sequence,sprite.input_sequence||'none');
}
console.log(`OK - ${total} observed sprite bitmaps, display-pointer writes and gallery data`);
