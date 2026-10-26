'use strict';
const path=require('path'),assert=require('assert');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const g=game(__dirname);g.lib('cpu6502');const {CPU}=globalThis.C64Cpu;
const {TR_STAGES,trMapCell}=g.run('levels.html','trMap','TR_STAGES','trMapCell');
const engine=g.listing('parts/resident/listing.json').ram;
let cases=0,cells=0;
for(const part of ['first-load','second-load']){
 const L=g.listing(`parts/${part}/listing.json`),m=engine.slice();
 for(let a=0;a<65536;a++)if(L.has[a])m[a]=L.ram[a];
 const s=TR_STAGES.find(s=>s.part===part);m.set(L.ram.slice(s.colours,s.colours+256),0x2cc0);
 for(let x=0;x<320;x++)for(const y of [0,4,24,60]){
  const io=new Map(),c=new CPU(m.slice(),{port:0x35,io:{read(a){return io.get(a)||0;},write(a,v){io.set(a,v);}}});
  c.m[0x207]=x&255;c.m[0x208]=x>>8;c.m[0x209]=y;c.m[0x677]=0;c.call(0x2a6c);
  for(let r=0;r<20;r++){const got=trMapCell(L.ram,s,x,y+r),a=0x4027+r*40;assert.equal(got.glyph,c.m[a],`${part} ${x},${y+r}`);assert.equal(c.m[a],c.m[a+0x400]);assert.equal(got.colour,io.get(0xd800+0x27+r*40)&15);cells++;}
  cases++;
 }
}
assert.equal(cells,51200);console.log(`PASS: ${cases} native map columns, ${cells} cells across both resource loads`);
