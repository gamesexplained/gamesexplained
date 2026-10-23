'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-03/listing.json');
const {labyrinthBrickDoorData:d,labyrinthBrickOpenDoor:open}=g.run('levels.html','labyrinth-brick-door','labyrinthBrickDoorData','labyrinthBrickOpenDoor');
for(const [a,v] of [[0x600,d.cells],[0x73e,d.types],[0x71e,d.replacements]])assert.deepStrictEqual(Array.from(ram.slice(a,a+v.length)),Array.from(v));
const texts={};for(const a of [0x92ca,0x94bb]){
 const c=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25}});c.m[0x10]=a&255;c.m[0x11]=a>>8;let text='';
 c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>{text+=' ';},0x6866:c=>c.rts()}});texts[a]=text;
}
for(let mode=0;mode<256;mode++)for(let cell=0;cell<256;cell++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=mode;c.m[0x569]=255;let mutation=null,sound=null,response=null;
 c.call(0x9053,{d:0},{hooks:{0x0818:c=>{c.a=cell&15;c.x=d.types[cell&15];c.y=36;c.rts();},0x081b:c=>{mutation=[c.a,c.y];c.rts();},0x081e:c=>{sound=c.a;c.rts();},0x0827:c=>{assert.equal(c.a,5);response=texts[c.x*256+c.y];c.rts();}}});
 const r=open(cell,mode);assert.equal(r.opened,mutation!==null);
 if(r.opened){assert.deepStrictEqual(mutation,[r.cell,36]);assert.equal(sound,1);assert.equal(c.m[0x569],0);}
 else {assert.equal(r.cell,cell);assert.equal(response,r.message);assert.equal(sound,null);assert.equal(c.m[0x569],255);}
}
for(const [x,depth,expected] of [[2272,6,false],[2348,24,true]]){
 assert(g.read('levels.html').includes('value="'+x+'"'));
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0x5e]=63;c.m[0x538]=x&255;c.m[0x53c]=x>>8;c.m[0x544]=depth;c.m[0x531]=3;c.m[0x530]=255;c.m[0x569]=3;
 let response=null,sound=null;c.call(0x9053,{d:0},{hooks:{0x081e:c=>{sound=c.a;c.rts();},0x0827:c=>{response=texts[c.x*256+c.y];c.rts();}}});
 const column=x>>6;assert.equal(c.m[0x600+column],expected?6:0);assert.equal(c.m[0x569],expected?4:3);assert.equal(c.m[0x530],expected?0:255);
 if(expected){assert.equal(sound,1);assert.equal(c.m[0x400],3);assert.equal(c.m[0x455],36);assert.equal(c.m[0x4aa],6);}
 else assert.equal(response,'Nothing happens.');
}
assert.equal(open(6).message,texts[0x92ca]);
console.log('OK - 65,536 original handler decisions, original response texts, counter wrap, and two complete classifier/mutation cases at the page’s observed positions');

g.sameBlock('labyrinth-brick-door');
