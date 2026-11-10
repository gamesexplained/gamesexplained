'use strict';
// Reconstruct each explicitly forced record example using the game's own listing.
const assert=require('assert'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,parts=path.join(root,'parts'),data=JSON.parse(fs.readFileSync(path.join(root,'record-sprite-candidates.json'))),base=new Uint8Array(65536);assert.equal(data.probe_frames,200);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
let total=0;
for(const capture of data.loads){
 const dir=path.join(parts,`stage-${String(capture.stage).padStart(2,'0')}`),m=base.slice(),symbols=JSON.parse(fs.readFileSync(path.join(dir,'symbols.json')));
 for(const r of JSON.parse(fs.readFileSync(path.join(dir,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 const pointer=m[0x7f4f]|m[0x7f50]<<8,limit=m[0x7f51];
 for(const candidate of capture.slots){
  const rec=candidate.record-1,address=pointer+rec*10;assert.equal(address,candidate.record_address);assert.equal(candidate.record_within_limit,rec<limit);assert.notEqual(m[address],0);assert.equal(candidate.executions,0);
  const s=m.slice();s[0xe2]=pointer&255;s[0xe3]=pointer>>8;new CPU(s).call(0x369e,{x:1,y:rec*10},{maxSteps:1000});
  const init=new CPU(s);init.pc=0x200d;init.x=1;init.run({until:0x2019,maxSteps:100});
  s[0x1a2a]=20;s[0x1a3b]=21;s[0x1a4c]=22;s[0x1a5d]=23;s[0x1a90]=0;s[0x1aa1]=0;s[0x1a08]=7;s[0x1dc6]=75;
  const render=new CPU(s);render.pc=0x1c7c;render.x=1;render.run({until:0x1b62,maxSteps:1000});
  const i=candidate.display.index;assert.equal(s[0x4c8f+i],candidate.pointer);assert.equal(s[0x4ccf+i],candidate.display.y);assert.equal(s[0x4c2f+i],candidate.display.flags);assert.equal(s[0x4caf+i],candidate.display.colour);
  const a=0xc000+64*candidate.pointer;assert.equal(a,candidate.address);assert.equal(crypto.createHash('sha256').update(m.slice(a,a+63)).digest('hex'),candidate.hash);
  const block=symbols.blocks.find(b=>b.start===a);assert(block&&block.type==='Byte'&&block.end===a+62);const comment=symbols.comments.find(c=>c.address===a&&c.type==='line');assert(comment&&comment.text.includes('controlled simulation')&&comment.text.includes(`entity record ${candidate.record}`));total++;
 }
}
assert.equal(total,94);
const html=fs.readFileSync(path.join(root,'graphics.html'),'utf8'),match=html.match(/<script id="observed-sprites-data" type="application\/json">([^<]+)<\/script>/);assert(match);
const frames=JSON.parse(match[1]).filter(f=>f.sequence==='record');assert.equal(frames.length,total);
for(const capture of data.loads)for(const candidate of capture.slots){
 const frame=frames.find(f=>f.load===capture.stage&&f.pointer===candidate.pointer),sample=candidate.display;assert(frame);assert.equal(frame.record,candidate.record);
 assert.equal(crypto.createHash('sha256').update(Uint8Array.from(frame.pixels)).digest('hex'),candidate.hash);assert.equal(frame.displaySlot,sample.index);assert.equal(frame.y,sample.y);assert.equal(frame.multicolour,!!(sample.flags&1));assert.equal(frame.colour,sample.colour&15);
}
console.log(`OK - ${total} controlled record selections and gallery bitmaps`);
