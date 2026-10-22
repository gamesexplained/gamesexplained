'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-05/listing.json');
const {labyrinthWallEighth:eighth,labyrinthWallHourEvent:event}=g.run('levels.html','labyrinth-wall-manicure','labyrinthWallEighth','labyrinthWallHourEvent');
const c=new CPU(Uint8Array.from(ram));let commands=0,hoursChecked=0;
function command(gate,item,damage,hours=12,minutes=51,outcome=255){
 const d=eighth(gate,item,damage,hours,minutes,outcome),outputs=[],sounds=[],events=[];let queries=0;
 for(const[a,v]of [[0x343,gate],[0x673e,item],[0x56c,damage],[0x8ea6,7],[0x376,hours],[0x375,minutes],[0x580,outcome],[0x8e9f,7],[0x356,3],[0x8ea3,4],[0x8eaa,5]])c.m[a]=v;
 c.call(0x90e2,{d:0},{hooks:{0x0aa8:()=>{queries++;},0x081e:c=>{sounds.push(c.a);c.rts();},0x0928:c=>{events.push(c.a);assert.equal(c.m[0x376],hours);assert.equal(c.m[0x8ea6],8);c.rts();},0x0827:c=>{outputs.push({address:c.y+256*c.x,mode:c.a});c.rts();}}});
 assert.deepStrictEqual(outputs,d.address===null?[]:[{address:d.address,mode:d.mode}]);assert.deepStrictEqual(events,d.event===null?[]:[d.event]);assert.deepStrictEqual(sounds,d.sound===null?[]:[d.sound]);assert.equal(queries,gate<128?0:1);
 for(const[a,v]of [[0x8ea6,d.counter],[0x376,d.hours],[0x375,d.minutes],[0x580,d.outcome],[0x673e,item],[0x56c,damage],[0x8e9f,d.local===null?7:d.local]])assert.equal(c.m[a],v,`state $${a.toString(16)}`);
 assert.deepStrictEqual([c.m[0x356],c.m[0x8ea3],c.m[0x8eaa]],[3,4,5]);commands++;
}
for(let gate=0;gate<256;gate++)for(const item of [0,127,128,255])for(const damage of [0,127,128,255])command(gate,item,damage);
for(let item=0;item<256;item++)for(let damage=0;damage<256;damage++)command(255,item,damage);
for(let hours=0;hours<256;hours++)for(let outcome=0;outcome<256;outcome++)for(const minutes of [0,51,59,255]){
 const d=eighth(255,0,0,hours,minutes,outcome);c.m[0x376]=hours;c.m[0x375]=minutes;c.m[0x580]=outcome;const events=[];c.call(0x0c61,{d:0},{hooks:{0x0928:c=>{events.push(c.a);c.rts();}}});assert.deepStrictEqual(events,[event.request]);assert.equal(c.m[0x376],d.hours);assert.equal(c.m[0x375],d.minutes);assert.equal(c.m[0x580],d.outcome);hoursChecked++;
}
command(255,0,0,0);command(255,0,0,1);
// Execute the real positive event lookup, stopping before full presentation.
c.m[0x6994]=event.request;c.call(0x699c,{d:0},{hooks:{0x69bf:()=>true}});assert.equal(c.m[0x10]+256*c.m[0x11],event.address);assert.equal(ram[0x6c77]+256*ram[0x6c3a],event.address);
assert.deepStrictEqual([...ram.slice(event.address,event.address+4)],[9,2,255,255]);
{const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=event.address&255;c.m[0x11]=event.address>>8;let text='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>text+=' ',0x6866:c=>c.rts()}});assert.equal(text.replace(/\s+/g,' ').trim(),event.text);}
// Clock display and hour helper retain the same bytes as the annotated opening.
const opening=g.listing('parts/opening/listing.json').ram;
for(const[start,end]of [[0x0b8e,0x0bc6],[0x0c61,0x0c70]])assert.deepStrictEqual([...ram.slice(start,end+1)],[...opening.slice(start,end+1)]);
for(const bad of [-1,256,.5,NaN])for(let i=0;i<6;i++){const args=[255,0,0,12,51,255];args[i]=bad;assert.throws(()=>eighth(...args),RangeError);}
console.log(`OK - ${commands} original eighth-command cases, ${hoursChecked} original hour/outcome/minute cases, real event lookup and original text expansion; live hour loss and controlled expiry agree`);
