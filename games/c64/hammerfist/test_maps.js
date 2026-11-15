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
 }
}
// The Discoveries tab draws the docking area's rooms 8 and 9 from the same records.
const disc=JSON.parse(g.read('discoveries.html').match(/id="hf-room-data">([\s\S]*?)<\/script>/)[1]),dock=data.find(d=>d.id==='docking-area');
assert.deepStrictEqual(disc.map(r=>r.room),[8,9]);for(const r of disc){const want=dock.rooms.find(x=>x.room===r.room);assert(!want.routable);for(const k of ['screen','colour','charset','palette'])assert.deepStrictEqual(r[k],want[k],'discoveries room '+r.room+' '+k);}
console.log(tiles+' room tile calls and '+banks+' character banks match original code; Discoveries rooms 8 and 9 match');
