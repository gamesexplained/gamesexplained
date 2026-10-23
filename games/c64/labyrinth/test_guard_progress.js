'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardDoorData:data,labyrinthGuardProgress:progress}=g.run('levels.html','labyrinth-alph-conversation','labyrinthGuardDoorData','labyrinthGuardProgress');
const brick=g.listing('parts/scene-03/listing.json').ram,opening=g.listing('parts/opening/listing.json').ram;
let closed=0,open=0;for(let column=0;column<64;column++){const type=brick[0x73e+(brick[0x600+column]&15)];if(type===2)closed++;if(type===3)open++;}
assert.equal(data.total,closed+open);assert.equal(data.initialOpen,open);assert.equal(closed,12);assert.deepStrictEqual([...opening.slice(0x575a,0x575f)],[0xa9,data.initialOpen,0x8d,0x69,0x05]);assert.equal(data.threshold,ram[0x8fc1]);
for(const [handler,column,presence] of [[0x8fa8,1,0],[0x8fae,3,1]])for(let count=0;count<256;count++)for(let index=0;index<3;index++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x569]=count;c.m[0x56a]=1;c.m[0x56b]=255;c.m[0x8f04]=index;c.m[0x8f0c]=0;c.m[0xaf]=column;c.m[0x53e]=presence;let actual;
 c.call(handler,{d:0},{hooks:{0x0812:c=>{c.a=c.nz(0);c.rts();},0x0827:c=>{actual={address:c.y+256*c.x,next:c.m[0x8f04],acknowledgement:c.m[0x56b]};return true;}}});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(progress(count,index))),actual,`${handler.toString(16)} count${count} index${index}`);
}
const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=data.thanksAddress&255;c.m[0x11]=data.thanksAddress>>8;let text='';
c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>{text+=' ';},0x6866:c=>c.rts()}});assert.equal(text.replace(/\s+/g,' ').trim(),data.thanksText);
const html=g.read('levels.html');assert(html.includes('<option value="14">'));assert(html.includes('<option value="15">'));assert.equal(progress(14).address,0x9b1d);assert.equal(progress(15).address,0x9c28);
for(const bad of [-1,256,0.5,NaN])assert.throws(()=>progress(bad),RangeError);
console.log('OK - 1,536 original ASK count/index cases through both accepted prerequisites, original thanks parse, all64 Brick Hallway cells and the original counter initializer; page counts14/15 included');
