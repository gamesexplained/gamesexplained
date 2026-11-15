'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const CPU=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),L=g.listing();g.sameBlock('dizzyView');
const {createView}=g.run('levels.html','dizzyView','createView');
const frameText=g.read('levels.html').match(/const FRAME=(.*);\nconst ASSETS=/)[1];
const assetText=g.read('levels.html').match(/const ASSETS=(.*);\n/)[1];
const F=JSON.parse(frameText),A=JSON.parse(assetText),V=createView(L.ram,CPU,F);
let records=0;
for(const r of A.rooms){
 const end=0x80cc+(L.ram[0x8002+2*r.id]|L.ram[0x8003+2*r.id]<<8);
 assert.equal(end,r.end);records+=r.records.length;
 for(const objects of [false,true]){
  const m=V.room(r.id,objects);assert(m.slice(0x6000,0x8000).some(x=>x));
 }
}
assert.equal(records,2783);
const valid=new Set(A.shapes.map(s=>s.id));
for(const r of A.rooms)for(const rec of r.records)assert(valid.has(rec[0]));
for(const o of A.objects)assert(valid.has(o.shape));
for(const s of A.shapes)for(const mirror of [false,true])for(const shift of [false,true]){
 const m=V.shape(s.id,mirror,shift);assert.equal(m[0x3dc],0);assert.equal(m[0x3df],255);
 const a=(0xa700+(L.ram[0xa500+2*s.id]|L.ram[0xa501+2*s.id]<<8))&65535;assert.equal(a,s.address);
 assert.deepEqual(Array.from(L.ram.slice(a+2,a+2+s.bytes.length)),s.bytes);
}
console.log('OK: 101 streams, 2783 records, 202 room views and 784 shape/transform cases run through the game renderer.');
