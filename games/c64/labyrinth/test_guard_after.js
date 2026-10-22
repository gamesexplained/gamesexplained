'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardAfterData:data,labyrinthGuardAfter:after}=g.run('levels.html','labyrinth-guard-after','labyrinthGuardAfterData','labyrinthGuardAfter');
let c=new CPU(Uint8Array.from(ram));
for(let index=0;index<256;index++)for(let flag=0;flag<256;flag++){
 c.m[0x8f04]=index;c.m[0x8f13]=flag;c.m[0x569]=15;c.m[0x56a]=1;c.m[0x56b]=15;let pointer;
 c.call(0x9004,{d:0},{hooks:{0x9419:c=>{pointer=c.y+256*c.x;return true;}}});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(after(index,flag))),{address:pointer,next:c.m[0x8f04]},`index${index}, flag${flag}`);
 assert.deepStrictEqual([...c.m.slice(0x569,0x56c)],[15,1,15]);assert.equal(c.m[0x8f13],flag);
}
for(const [handler,column,presence] of [[0x8fa8,1,0],[0x8fae,3,1]])for(let index=0;index<3;index++)for(let flag=0;flag<256;flag++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x569]=15;c.m[0x56a]=1;c.m[0x56b]=15;c.m[0x8f04]=index;c.m[0x8f0c]=0;c.m[0x8f13]=flag;c.m[0xaf]=column;c.m[0x53e]=presence;let actual;
 c.call(handler,{d:0},{hooks:{0x0812:c=>{c.a=c.nz(0);c.rts();},0x0827:c=>{actual={address:c.y+256*c.x,next:c.m[0x8f04]};assert.equal(c.a,handler===0x8fa8?6:32);return true;}}});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(after(index,flag))),actual);
 assert.deepStrictEqual([...c.m.slice(0x569,0x56c)],[15,1,15]);
}
for(const reply of data.replies){
 const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=reply.address&255;c.m[0x11]=reply.address>>8;let text='';
 c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>text+=' ',0x6866:c=>c.rts()}});
 assert.equal(text.replace(/\s+/g,' ').trim(),reply.text);
}
let index=data.index;assert.equal(index,2);assert.equal(data.flag,255);for(let n=0;n<3;n++){const result=after(index,data.flag);assert.equal(result.address,0x9abd);index=result.next;assert.equal(index,2);}
for(const bad of [-1,256,.5,NaN]){assert.throws(()=>after(bad,255),RangeError);assert.throws(()=>after(2,bad),RangeError);}
console.log('OK - 65,536 original phase-one index/flag decisions, 1,536 complete ASK paths through accepted presence branches, two original text parses and repeated captured state; phase/count/acknowledgement retained');
