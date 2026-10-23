'use strict';
const assert=require('assert');
const path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const g=require('./layered.js')(game(__dirname));
const {labyrinthFont,labyrinthGlyph}=g.run('levels.html','labyrinth-font','labyrinthFont','labyrinthGlyph');
const {ram,has}=require('./opening_image.js')(g);
g.lib('c64');
const C64=globalThis.C64;
assert.equal(labyrinthFont.length,2048);
for(let i=0;i<2048;i++) {assert(has[0xd000+i]);assert.equal(labyrinthFont[i],ram[0xd000+i]);}
for(let index=0;index<256;index++) {
 const expected=new Uint8Array(64);
 const ctx={fillStyle:'',fillRect(x,y,w,h){
  for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)expected[row*8+col]=this.fillStyle==='on'?1:0;
 }};
 C64.drawGlyph(ctx,ram.subarray(0xd000,0xd800),index,0,0,1,'on','off');
 const glyph=labyrinthGlyph(index);
 assert.deepStrictEqual(Array.from(glyph.bytes),Array.from(ram.subarray(0xd000+index*8,0xd008+index*8)));
 assert.deepStrictEqual(Array.from(glyph.pixels),Array.from(expected),`glyph ${index}`);
}
for(const index of [-1,256,0.5,NaN])assert.throws(()=>labyrinthGlyph(index),/Glyph number/);
console.log('OK - all 2048 font bytes match the listing; all 256 glyphs match the C64 renderer');
