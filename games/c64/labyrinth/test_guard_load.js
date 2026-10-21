'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardSceneRequest:request,labyrinthGuardLaterArrival:data}=g.run('levels.html','labyrinth-guard-load','labyrinthGuardSceneRequest','labyrinthGuardLaterArrival');
assert.deepStrictEqual([...ram.slice(0x59af,0x59dc)],[...g.listing('parts/opening/listing.json').ram.slice(0x59af,0x59dc)]);
const c=new CPU(Uint8Array.from(ram));let count=0;
function run(cell,pending,entry){c.m[0x2c3]=cell;c.m[0x530]=pending;c.m[0x532]=entry;const calls=[];let end;
 c.call(0x59af,{d:0},{hooks:{0x60e6:c=>{calls.push('close');c.rts();},0x5098:c=>{calls.push('load');c.rts();},0x59dc:()=>{end='load';return true;},0x59e9:()=>{end='no-load';return true;}}});
 const d=request(cell,pending,entry);assert.equal(c.m[0x2c3],d.cell);assert.equal(c.m[0x530],d.pending);assert.equal(c.m[0x532],d.entry);assert.deepStrictEqual(calls,d.load?['close','load']:[]);assert.equal(end,d.load?'load':'no-load');count++;return d;
}
for(let cell=0;cell<256;cell++)for(let pending=0;pending<256;pending++)for(const entry of [0,1,254,255])run(cell,pending,entry);
for(let entry=0;entry<256;entry++)for(const cell of [0,5,127,128,255])for(const pending of [0,127,128,255])run(cell,pending,entry);
const b=data.before,d=run(b.cell,b.pending,b.entry);assert.equal(d.pending,data.destination);assert.equal(d.entry,data.entry);assert.equal(d.cell,255);assert.equal(d.load,true);
assert.equal(data.destination,5);assert.equal(data.entry,1);assert.equal(data.x,84);assert.equal(data.depth,6);assert.equal(data.cases.length,3);
// The phase cap is part of the real guard callback; destination positions are VICE observations.
c.m[0x56a]=data.phase;c.call(0x8e9e,{d:0});assert.equal(c.m[0x56a],4);assert.equal(data.phase,4);
for(const bad of [-1,256,.5,NaN])for(let i=0;i<3;i++){const a=[5,255,255];a[i]=bad;assert.throws(()=>request(...a),RangeError);}
console.log(`OK - ${count} original scene-request hand-offs, exact close/load order, retained opening bytes and phase4 cap; three completed VICE loads establish the arrival separately`);
