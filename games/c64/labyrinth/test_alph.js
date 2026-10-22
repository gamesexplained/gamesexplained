'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthAlphReplies:replies,labyrinthAlphAsk:ask}=g.run('levels.html','labyrinth-alph-conversation','labyrinthAlphReplies','labyrinthAlphAsk');
assert.equal(ram[0x8b0c],30);assert.equal(ram[0x8b0d],44);assert.equal(ram[0x8bcc]+256*ram[0x8bcd],0x8fa8);
for(let progress=0;progress<15;progress++)for(let index=0;index<3;index++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x569]=progress;c.m[0x8f04]=index;c.m[0x8f0c]=0;let pointer;
 c.call(0x8fa8,{d:0},{hooks:{0x939a:c=>c.rts(),0x9419:c=>{pointer=c.y+256*c.x;return true;}}});
 const result=ask(index);assert.equal(result.address,pointer);assert.equal(result.next,c.m[0x8f04]);assert.equal(replies[index].address,pointer);assert.equal(pointer,ram[0x9001+index]+256*ram[0x8ffe+index]);
}
for(let value=0;value<256;value++){
 const c=new CPU(Uint8Array.from(ram));c.m[0xaf]=1;let pointer;
 c.call(0x90c3,{d:0},{hooks:{0x93d1:c=>{c.a=c.nz(value);c.rts();},0x9419:c=>{pointer=c.y+256*c.x;return true;}}});
 assert.equal(pointer,value===0?0x97b1:0x97d7);assert.equal(c.m[0x342],6);
}
for(const reply of [...replies,{address:0x97b1,text:"I'm here! You don't have to shout!"}]){
 const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=reply.address&255;c.m[0x11]=reply.address>>8;let text='';
 c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>{text+=' ';},0x6866:c=>c.rts()}});
 assert.equal(text.replace(/\s+/g,' ').trim(),reply.text);
}
let index=0;for(const expected of [1,2,2,2]){index=ask(index).next;assert.equal(index,expected);}
for(const bad of [-1,3,255,0.5,NaN])assert.throws(()=>ask(bad),RangeError);
console.log('OK - 45 original opening-conversation decisions, four original reply parses and 256 CALL branch cases, and repeated final reply; presence check intercepted, live CALL/ASK sequence recorded separately');
