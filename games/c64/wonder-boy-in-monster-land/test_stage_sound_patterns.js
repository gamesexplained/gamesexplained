'use strict';
// Check every described later-load voice list and run the real sequencer through its captured loop.
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,parts=path.join(root,'parts'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const data=JSON.parse(html.match(/<script id="wb-sound-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
function layer(mem,file){for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)mem.set(r.b,r.a);}
const memory=new Uint8Array(65536);layer(memory,path.join(parts,'resident/listing.json'));let total=0;
for(let number=1;number<=31;number++){
 const dir=path.join(parts,`stage-${String(number).padStart(2,'0')}`);layer(memory,path.join(dir,'listing.json'));if(number===1)continue;
 const symbols=JSON.parse(fs.readFileSync(path.join(dir,'symbols.json'))), patterns=new Map();
 for(let voice=0;voice<3;voice++){
  const addr=memory[0x7f58+2*voice]|memory[0x7f59+2*voice]<<8;let p=addr,count=0;
  while(memory[p]!==0&&count<80){const target=memory[p]|memory[p+1]<<8;if(!patterns.has(target))patterns.set(target,[]);patterns.get(target).push(p);p+=2;count++;}
  assert(count<80,`load ${number}, voice ${voice+1}: terminator`);
  const block=symbols.blocks.find(b=>b.start===addr);assert(block&&block.type==='Byte'&&block.end===p,`load ${number}, voice ${voice+1}: block`);
  const comment=symbols.comments.find(c=>c.address===addr&&c.type==='line');assert(comment&&comment.text.includes(`${count} little-endian pattern pointers`)&&comment.text.includes(`$${p.toString(16).toUpperCase()}`));
 }
 const expected=new Map();let index=0;
 for(const [addr,refs] of [...patterns].sort((a,b)=>a[0]-b[0])){
  let end=addr;while(memory[end]!==0&&end-addr<512)end++;assert(end-addr<512,`load ${number}: pattern end`);
  const block=symbols.blocks.find(b=>b.start===addr);assert(block&&block.type==='Byte'&&block.end===end,`load ${number}: pattern block`);
  const label=symbols.symbols.find(s=>s.address===addr);assert(label&&label.name===`load_sound_pattern_${String(++index).padStart(2,'0')}`);
  const comment=symbols.comments.find(c=>c.address===addr&&c.type==='line');assert(comment&&comment.text.includes(`${end-addr} nonzero event bytes`)&&comment.text.includes(`$${end.toString(16).toUpperCase()}`));
  for(const ref of refs)assert(comment.text.includes(`$${ref.toString(16).toUpperCase()}`));expected.set(addr,end);total++;
 }
 const m=memory.slice(),track=data.tracks[number-1],sid=Uint8Array.from(track.seed);[0x223a,0x2241,0x2248].forEach((a,i)=>m[a]=track.notes[i]);
 const cpu=new CPU(m,{port:0x35,io:{read:()=>0,write:(a,v)=>{assert(a>=0xd400&&a<=0xd418);sid[a-0xd400]=v;}}});m[0x2c15]=1;
 const selected=new Set(),ended=new Map(),hooks={0x2303:c=>{selected.add(m[0x2225+c.x]|m[0x2226+c.x]<<8)},0x2322:c=>{const a=m[0x4e]|m[0x4f]<<8,p=(a+c.y)&65535;if(m[p]===0)ended.set(a,p)}};
 for(let frame=0;frame<track.frames+4;frame++)cpu.call(0x2201,{}, {hooks,maxSteps:100000});
 for(const [a,end] of expected){assert(selected.has(a),`load ${number}: pattern ${a.toString(16)} selected`);assert.equal(ended.get(a),end,`load ${number}: sequencer end`);}
}
assert.equal(total,207);console.log('OK - 90 voice lists and 207 later-load patterns reached their documented ends');
