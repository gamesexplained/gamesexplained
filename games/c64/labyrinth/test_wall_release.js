'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-05/listing.json');
const {labyrinthWallNinth:ninth,labyrinthWallReleaseMove:move,labyrinthWallReleaseExit:data,labyrinthWallReleaseJourney:journey}=g.run('levels.html','labyrinth-wall-manicure','labyrinthWallNinth','labyrinthWallReleaseMove','labyrinthWallReleaseExit','labyrinthWallReleaseJourney');
const c=new CPU(Uint8Array.from(ram));let commands=0,moves=0,exits=0;
function command(gate,item,damage,animationCount=37){const d=ninth(gate,item,damage),outputs=[],sounds=[];
 for(const[a,v]of [[0x343,gate],[0x673e,item],[0x56c,damage],[0x8ea6,8],[0x8e9f,7],[0x356,3],[0x8ea3,4],[0x8eaa,animationCount],[0x376,11],[0x375,51]])c.m[a]=v;
 c.call(0x90e2,{d:0},{hooks:{0x081e:c=>{sounds.push(c.a);c.rts();},0x0821:c=>{c.a=c.nz(7);c.rts();},0x0827:c=>{outputs.push({address:c.y+256*c.x,mode:c.a});c.rts();},0x0928:()=>{throw new Error('Unexpected clock event');}}});
 assert.deepStrictEqual(outputs,[{address:d.address,mode:d.mode==='varied'?18:d.mode}]);assert.deepStrictEqual(sounds,d.sound===null?[]:[d.sound]);assert.equal(c.m[0x8ea6],d.counter);assert.equal(c.m[0x673e],item);assert.equal(c.m[0x56c],damage);assert.equal(c.m[0x8e9f],d.local===null?7:d.local);assert.deepStrictEqual([c.m[0x356],c.m[0x8ea3],c.m[0x8eaa]],d.animation?[12,12,animationCount]:[3,4,animationCount]);assert.equal(c.m[0x376],11);assert.equal(c.m[0x375],51);commands++;
}
for(let gate=0;gate<256;gate++)for(const item of [0,127,128,255])for(const damage of [0,127,128,255])command(gate,item,damage);
for(let item=0;item<256;item++)for(let damage=0;damage<256;damage++)command(255,item,damage);
for(let count=0;count<256;count++){c.m[0x8eaa]=count;command(255,0,0,count);}
// All values accepted by the later-count branch, independent of reaching them in play.
for(let count=0;count<256;count++){c.m[0x356]=3;c.m[0x8ea3]=4;c.m[0x8eaa]=21;let output=null;c.call(0x9142,{a:count,y:0x55,x:0xaa,d:0},{hooks:{0x9155:()=>true,0x0821:c=>{c.a=c.nz(7);c.rts();},0x0827:c=>{output=c.y+256*c.x;c.rts();}}});assert.equal(output,count>=9?0x9bd6:null);assert.equal(c.m[0x356],count>=9?12:3);assert.equal(c.m[0x8ea3],count>=9?12:4);assert.equal(c.m[0x8eaa],21);}
for(let selector=0;selector<256;selector++)for(const seed0 of [0,31,64,255])for(const seed1 of [0,32,63,255])for(const random of [0,31,96,255]){
 c.m[0x76e]=selector;c.m[0x500]=seed0;c.m[0x501]=seed1;c.call(0x8d81,{x:0,y:37,d:0},{hooks:{0x0821:c=>{c.a=c.nz(random);c.rts();}}});const d=move(126,selector,seed0,seed1,random);assert.equal(c.m[0x530],d.scene);assert.equal(c.m[0x532],d.entry);assert.equal(c.x,d.index);assert.equal(c.y,37);exits++;
}
for(let vertical=0;vertical<256;vertical++){
 c.m[0x218]=vertical;c.m[0x293]=17;c.m[0x76e]=0;c.m[0x530]=255;c.m[0x532]=255;let pose=0;c.call(0x8cd8,{x:12,y:37,d:0},{hooks:{0x8d55:c=>{pose++;c.rts();},0x8cf7:()=>true}});const d=move(vertical,0,0,0,0);assert.equal(c.m[0x218],d.vertical);assert.equal(pose,d.exit?0:1);assert.equal(c.m[0x293],d.exit?0:17);assert.equal(c.m[0x530],d.exit?d.scene:255);assert.equal(c.m[0x532],d.exit?d.entry:255);moves++;
}
for(let state=0;state<256;state++)if(state!==12){c.m[0x218]=26;c.call(0x8cd8,{x:state,d:0},{hooks:{0x8cf7:()=>true}});assert.equal(c.m[0x218],26);}
assert.equal(data.selector,ram[0x76e]);for(let i=0;i<4;i++){assert.equal(data.scenes[i],ram[0x77e+32*i]);assert.equal(data.entries[i],ram[0x78e+32*i]);}
const live=move(126,0,0,96,0);assert.deepStrictEqual(live,{vertical:130,exit:true,scene:6,entry:7,index:0});assert.equal(data.arrivalX,480);assert.equal(data.arrivalDepth,6);assert.equal(journey[3].image,'stone-corridor-arrival.png');
{const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=0xd6;c.m[0x11]=0x9b;let text='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>text+=' ',0x6866:c=>c.rts()}});assert.equal(journey[0].text,'MANICURE WALL: '+text.replace(/\s+/g,' ').trim());}
for(const bad of [-1,256,.5,NaN])for(let i=0;i<5;i++){const args=[26,0,0,96,0];args[i]=bad;assert.throws(()=>move(...args),RangeError);}
console.log(`OK - ${commands} original ninth commands, 256 later-count branch inputs, ${moves} movement-prefix values, 255 bypass states and ${exits} exit-selector cases; live descent/request and loaded arrival agree`);
