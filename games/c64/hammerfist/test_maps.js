'use strict';
const assert=require('assert'),{game}=require('../../../kit/scripts/port_check.js'),g=game(__dirname);g.lib('cpu6502');
const page=g.read('levels.html'),data=JSON.parse(page.match(/id="hf-map-data">([\s\S]*?)<\/script>/)[1]);
function memory(id){const m=new Uint8Array(65536);for(const part of ['resident','complex-7',...(id==='complex-7'?[]:[id])]){const L=g.listing('parts/'+part+'/listing.json');for(let a=0;a<65536;a++)if(L.has[a])m[a]=L.ram[a];}return m;}
let tiles=0,banks=0;
for(const d of data){const original=memory(d.id);
 for(const room of d.rooms){let m=new Uint8Array(original),colour=new Uint8Array(1024),cpu=new C64Cpu.CPU(m,{port:0x35,io:{write:(a,v)=>{assert(a>=0xd800&&a<0xdc00);colour[a-0xd800]=v&15;}}});
  for(let c=0;c<10;c++)for(let r=0;r<5;r++){const dst=0x4c8+r*160+c*4;m[0x1c]=dst&255;m[0x1d]=dst>>8;cpu.call(d.tileRoutine,{x:room.record[c*6+r],y:(room.record[c*6+5]>>r)&1});tiles++;}
  assert.deepStrictEqual(Array.from(m.slice(0x4c8,0x7e8)),room.screen);assert.deepStrictEqual(Array.from(colour.slice(200,1000)),room.colour);
  m=new Uint8Array(original);cpu=new C64Cpu.CPU(m,{port:0x35});if(room.bank)cpu.call(d.swapRoutine,{y:room.bank},{maxSteps:200000});assert.deepStrictEqual(Array.from(m.slice(0x800,0x1000)),room.charset);banks++;
  m=new Uint8Array(original);m[0x3c]=room.room;m[0x3a]=0;cpu=new C64Cpu.CPU(m,{port:0x35});cpu.call(d.animationSetup);const got=[];for(let slot=0;slot<24;slot++)if(m[0x218+slot])got.push((m[0x200+slot]|m[0x218+slot]<<8)-4);assert.deepStrictEqual(got,d.animations.filter(a=>a.room===room.room).slice(0,24).map(a=>a.address));
 }
 // Every tile the scenery preview may select, in either orientation.
 for(let orientation=0;orientation<2;orientation++)for(let tile=0;tile<d.tiles[orientation].length;tile++){
  const m=new Uint8Array(original),colour=new Uint8Array(1024),cpu=new C64Cpu.CPU(m,{port:0x35,io:{write:(a,v)=>{colour[a-0xd800]=v&15;}}});m[0x1c]=0xc8;m[0x1d]=4;cpu.call(d.tileRoutine,{x:tile,y:orientation});const got=[],cols=[];for(let y=0;y<4;y++)for(let x=0;x<4;x++){got.push(m[0x4c8+y*40+x]);cols.push(colour[200+y*40+x]);}assert.deepStrictEqual(got,d.tiles[orientation][tile].screen);assert.deepStrictEqual(cols,d.tiles[orientation][tile].colour);
 }
}
console.log(tiles+' room tile calls, '+banks+' character banks and animation schedules, and all preview tiles match original code');
