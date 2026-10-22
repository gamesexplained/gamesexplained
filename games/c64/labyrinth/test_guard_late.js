'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardLateAsk:ask,labyrinthGuardLateReplies:replies}=g.run('levels.html','labyrinth-guard-late','labyrinthGuardLateAsk','labyrinthGuardLateReplies');
let cases=0;
for(let i=0;i<4;i++)for(let first=0;first<2;first++)for(let second=0;second<2;second++)for(let speaker=0;speaker<2;speaker++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x8f04]=i;c.m[0x8f05]=speaker;c.m[0x8f06]=first;c.m[0x8f07]=second;c.m[0x8f08]=77;c.m[0x8f09]=88;let pointer;
 c.call(0x9087,{d:0},{hooks:{0x9419:c=>{pointer=c.y+256*c.x;c.rts();}}});
 const d=ask(i,first,second,speaker);assert.equal(d.address,pointer);assert.equal(d.next,c.m[0x8f04]);assert.equal(c.m[0x8f08],d.marked===0?1:77);assert.equal(c.m[0x8f09],d.marked===1?1:88);assert.equal(replies[d.entry].address,pointer);cases++;
}
for(const reply of replies){const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=reply.address&255;c.m[0x11]=reply.address>>8;let text='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>text+=' ',0x6866:c=>c.rts()}});assert.equal(text.replace(/\s+/g,' ').trim(),reply.text);}
assert.equal(ask(3,1,0,0).address,0x9b92);assert.equal(ask(3,1,1,0).address,0x9b73);
for(const bad of [-1,4,.5,NaN])assert.throws(()=>ask(bad,1,1,0),RangeError);
for(const bad of [-1,2,.5,NaN])for(const n of [1,2,3]){const a=[3,1,1,0];a[n]=bad;assert.throws(()=>ask(...a),RangeError);}
console.log(`OK - ${cases} original later ASK cases and five original text expansions; phase progression remains outside this comparison`);
