'use strict';
// The How it works page's room lookup against the engine's row filler at $4C01 on the kit's 6502:
// every block row of every scene's map, every third block column, all 16 rows of 40 cells.
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname));
const {labRoomCell}=g.run('index.html','lab-room','labRoomCell');
const scenes=[...g.read('index.html').matchAll(/\['(scene-\d\d)',/g)].map(m=>m[1]);
let cells=0;
for(const id of scenes){
 const {ram}=g.listing(`parts/${id}/listing.json`),code=ram[0x705],rows=1<<code,width=256>>code;
 for(let by=0;by<rows;by++)for(let bx=0;bx<Math.min(width,64);bx+=3){
  const c=new CPU(Uint8Array.from(ram));
  c.m[0x4F]=0;c.m[0x50]=bx;c.m[0x52]=0;c.m[0x53]=by;c.m[0x5E]=ram[0x59A1+code];c.m[0x5F]=ram[0x59A8+code];
  for(let y=0;y<16;y++)c.call(0x4C01,{y});
  // $4C01 fills row Y of the window from the bottom: Y=0 is the row at $CEF8.
  for(let y=0;y<16;y++)for(let x=0;x<40;x++){
   assert.equal(labRoomCell(ram,bx+(x>>4),by,x&15,y),c.m[0xCCA0+40*y+x],`${id} block ${bx},${by} cell ${x},${y}`);cells++;
  }
 }
}
console.log(`OK - ${cells} screen cells in ${scenes.length} scenes match $4C01`);
