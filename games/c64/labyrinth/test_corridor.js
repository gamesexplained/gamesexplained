'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-02/listing.json');
const {labyrinthCorridorData:d,labyrinthCorridorLookup:lookup}=g.run('levels.html','labyrinth-corridor','labyrinthCorridorData','labyrinthCorridorLookup');
for(const [a,v] of [[0x600,d.cells],[0x73e,d.types],[0x41f0,d.limits],[0x4200,d.flags],[0x74e,d.thresholds],[0x76e,d.selectors],...d.scenes.map((v,b)=>[0x77e+b*32,v]),...d.entries.map((v,b)=>[0x78e+b*32,v])])assert.deepStrictEqual(Array.from(ram.slice(a,a+v.length)),Array.from(v));
for(let x=0;x<65536;x++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0x5e]=63;c.m[0x538]=x&255;c.m[0x53c]=x>>8;c.call(0x4171,{d:0});
 const a=lookup(x,0);assert.equal(a.column,c.m[0xaf]);assert.equal(a.cell,c.m[0xb7]);assert.equal(a.type,c.m[0xb0]);assert.equal(a.limit,c.m[0xb2]);assert.equal(a.exitAllowed,c.m[0xb3]<128);
}
for(let col=0;col<64;col++)for(let variant=0;variant<4;variant++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0xaf]=col;
 c.call(0x4115,{d:0},{hooks:{0x4210:c=>{c.a=variant<<5;c.rts();}}});
 const a=lookup(col*64,variant);assert.equal(a.scene,c.m[0x530]);assert.equal(a.entry,c.m[0x532]);
}
for(let seed=0;seed<65536;seed++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x502]=seed&255;c.m[0x503]=seed>>8;c.call(0x4210,{d:0});const next=(seed*37+17)&65535;assert.equal(c.m[0x502]+256*c.m[0x503],next);assert.equal(c.a,next>>8);
}
const openings=Array.from({length:64},(_,i)=>i).filter(i=>lookup(i*64,0).exitAllowed);
assert.deepStrictEqual(openings,[8,15,24,30,35,41,50,58]);
for(const col of openings)for(let v=0;v<4;v++)assert.equal(lookup(col*64,v).scene,3);
// These are the actual initial controls on the page, not an extra test-only state.
assert(g.read('levels.html').includes('max="63" value="8"'));assert.equal(lookup(8*64,0).entry,8);
console.log('OK - 65,536 original coordinate classifications, 256 original exit choices, 65,536 PRNG updates, and page control defaults');
for(const flag of [0,255]){
 const c=new CPU(Uint8Array.from(ram));c.m[0x385]=255;c.m[0xb3]=flag;let exit=0;
 c.call(0x3772,{d:0},{hooks:{0x4115:c=>{exit++;c.rts();},0x378f:()=>true,0x37b3:()=>true}});assert.equal(exit,flag===0?1:0);
}
// Scalar observations at the live ordinary-input exit: X=546, seed=$435B.
{
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0xaf]=8;c.m[0x502]=0x5b;c.m[0x503]=0x43;c.call(0x4115,{d:0});assert.equal(c.m[0x530],3);assert.equal(c.m[0x532],35);
}
console.log('OK - captured wall/passage boundary branches and ordinary-input scene 3 / entry 35 request');
const {labyrinthCorridorPlacement:placement}=g.run('levels.html','labyrinth-corridor','labyrinthCorridorPlacement');
const opening=g.listing('parts/opening/listing.json').ram;
assert.deepStrictEqual(Array.from(ram.slice(0x543a,0x54cc)),Array.from(opening.slice(0x543a,0x54cc)));
assert.equal(require('crypto').createHash('sha256').update(ram.slice(0x543a,0x54cc)).digest('hex'),'c2874d5bb9d9612369a722f6788cb60a272fb64bc4c69ff2dd8fa261f4200207');
for(let entry=0;entry<256;entry++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x26]=0;c.m.set([entry,255,26],0x5080);c.m[0x532]=entry;
 const oldX=c.m[0x538]+256*c.m[0x53c],oldDepth=c.m[0x544];c.call(0x543a,{d:0});
 const a=placement(entry);assert.equal(c.m[0x538]+256*c.m[0x53c],a?a.x:oldX);assert.equal(c.m[0x544],a?a.depth:oldDepth);assert.equal(c.m[0x532],255);
 assert.equal(c.m[0x53a]+256*c.m[0x53e],26*64+32);assert.equal(c.m[0x546],24);
}
assert.equal(placement(35).x,2272);assert.equal(placement(35).depth,6);
console.log('OK - 256 continuous-mode entry placements, FF leaves placement unchanged, companion slot and live entry-35 arrival');
