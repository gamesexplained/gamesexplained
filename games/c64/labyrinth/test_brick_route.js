'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-03/listing.json');
const {labyrinthBrickRouteEntries:entries,labyrinthBrickRoute:route}=g.run('levels.html','labyrinth-brick-route','labyrinthBrickRouteEntries','labyrinthBrickRoute');
for(let bank=0;bank<4;bank++){assert.equal(entries[bank],ram[0x78e+11+32*bank]);assert.equal(ram[0x77e+11+32*bank],0);}
assert.equal(ram[0x76e+11],1);assert(g.read('levels.html').includes('data-route-state="0"'));
for(let source=0;source<256;source++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0xaf]=36;c.m[0x500]=source;c.m[0x531]=3;c.call(0x4115,{d:0},{hooks:{0x4210:()=>{throw Error('This selector must not use the PRNG');}}});
 const r=route(source);assert.equal(c.m[0x530],r.request);assert.equal(c.m[0x532],r.entry);let retained=false;
 c.call(0x50ea,{d:0},{hooks:{0x53ce:()=>{retained=true;return true;}}});assert(retained);assert.equal(c.m[0x531],r.scene);
 c.m[0x26]=0;c.m.set([r.entry,255,255],0x5080);c.call(0x543a,{d:0});assert.equal(c.m[0x538]+256*c.m[0x53c],r.x);assert.equal(c.m[0x544],r.depth);assert.equal(c.m[0x532],255);
}
assert.equal(route(0).entry,12);assert.equal(route(0).x,800);
console.log('OK - all 256 route-state bytes against the original exit, retained-room branch and entry placement, including the page’s live source-zero case');
