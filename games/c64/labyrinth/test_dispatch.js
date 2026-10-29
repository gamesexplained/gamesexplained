'use strict';
// The How it works page's command lookup, reply decoder and random step, against the engine's own
// code on the kit's 6502: the dispatcher loop at $5F63, the printer at $67B5 and the generator at
// $4210, for every scene the page offers.
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname));
Object.assign(globalThis,g.run('index.html','labyrinth-dictionary','expandLabyrinthWord','labyrinthWords'));
const {labDispatch,labRows,labReply}=g.run('index.html','lab-dispatch','labDispatch','labRows','labReply');
g.sameBlock('labyrinth-dictionary');
const {labNextRandom}=g.run('index.html','lab-random','labNextRandom');
const scenes=[...g.read('index.html').matchAll(/\['(scene-\d\d)',/g)].map(m=>m[1]);
assert.equal(scenes.length,21);
let lookups=0,texts=0;
for(const id of scenes){
 const {ram}=g.listing(`parts/${id}/listing.json`),rows=labRows(ram);
 assert(rows.length<=96);
 const verbs=new Set([0x1C,0x2B,0xFF]),objs=new Set([0x2C,0x80,0xFF]);
 for(const r of rows){if(r.verb)verbs.add(r.verb);if(r.obj)objs.add(r.obj);}
 for(const v of verbs)for(const o of objs){
  const c=new CPU(Uint8Array.from(ram));c.m[0x6691]=v;c.m[0x6692]=o;let row=null;
  c.call(0x5F63,{},{hooks:{0x5F85:c=>{row=c.y>>1;return true;}}});
  const hit=labDispatch(ram,v,o);
  assert.equal(hit?hit.row:null,row,`${id} verb ${v} object ${o}`);lookups++;
 }
 for(const r of rows){
  if(r.word>=0x8000)continue;
  const a=r.word|0x8000,c=new CPU(Uint8Array.from(ram));c.m[0x10]=(a+2)&255;c.m[0x11]=(a+2)>>8;let text='';
  c.call(0x67B5,{},{hooks:{0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x6866:c=>{text+=' ';c.rts();},
   0x68D4:c=>{text+=' \u0001'+c.m[(c.m[0x10]|c.m[0x11]<<8)+c.y]+'\u0001 ';c.pc=0x67B7;}}});
  // The printer's dictionary expansion is replaced by a marker: compare letters, and word numbers.
  const mine=labReply(ram,a);
  const flat=s=>s.replace(/\s+/g,' ').replace(/"/g,'').trim();
  const words=mine.pieces.filter(p=>p.kind==='w').map(p=>p.bytes[1]);
  const seen=[...text.matchAll(/\u0001(\d+)\u0001/g)].map(m=>+m[1]);
  assert.deepStrictEqual(seen,words,`${id} ${a.toString(16)} words`);
  const letters=mine.pieces.filter(p=>p.kind==='l').map(p=>String.fromCharCode(...p.bytes.filter(b=>b!==0x40))).join(' ');
  assert.equal(flat(text.replace(/\u0001\d+\u0001/g,' ')),flat(letters),`${id} ${a.toString(16)} letters`);
  texts++;
 }
}
const {ram}=g.listing('parts/resident/listing.json');
for(let s=0;s<65536;s++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x502]=s&255;c.m[0x503]=s>>8;c.call(0x4210,{});
 assert.equal(c.m[0x502]|c.m[0x503]<<8,labNextRandom(s),`state ${s}`);
}
console.log(`OK - ${lookups} command lookups and ${texts} replies in ${scenes.length} scenes match $5F63 and $67B5; 65,536 random steps match $4210`);
