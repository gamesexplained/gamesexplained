'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-05/listing.json');
const {labyrinthWallManicureStep:step,labyrinthWallManicureSequence:sequence}=g.run('levels.html','labyrinth-wall-manicure','labyrinthWallManicureStep','labyrinthWallManicureSequence');
const c=new CPU(Uint8Array.from(ram));let checked=0;
function run(count,gate,item,damage){
 const d=step(count,gate,item,damage),outputs=[],sounds=[];let queries=0;
 c.m[0x343]=gate;c.m[0x673e]=item;c.m[0x56c]=damage;c.m[0x8ea6]=count;c.m[0x8e9f]=7;c.m[0x356]=3;c.m[0x8ea3]=4;c.m[0x8eaa]=5;
 c.call(0x90e2,{d:0},{hooks:{0x0aa8:()=>{queries++;},0x081e:c=>{sounds.push(c.a);c.rts();},0x0821:c=>{c.a=c.nz(7);c.rts();},0x0827:c=>{outputs.push({address:c.y+256*c.x,mode:c.a});c.rts();},0x084e:()=>{throw new Error('Eighth-count effect entered outside bounded replay');}}});
 assert.deepStrictEqual(outputs,[{address:d.address,mode:d.mode==='varied'?18:d.mode}]);assert.equal(c.m[0x8ea6],d.counter);assert.equal(c.m[0x673e],item);assert.equal(c.m[0x56c],damage);assert.equal(c.m[0x343],gate);assert.equal(c.m[0x8e9f],d.local===null?7:d.local);assert.deepStrictEqual([c.m[0x356],c.m[0x8ea3],c.m[0x8eaa]],d.animation||[3,4,5]);assert.deepStrictEqual(sounds,d.sound===null?[]:[d.sound]);assert.equal(queries,gate<128?0:1);checked++;return d.counter;
}
for(let count=0;count<7;count++){
 for(let gate=0;gate<256;gate++)for(const item of [0,127,128,255])for(const damage of [0,127,128,255])run(count,gate,item,damage);
 for(let item=0;item<256;item++)for(let damage=0;damage<256;damage++)run(count,255,item,damage);
}
let count=0;for(let i=0;i<7;i++){assert.equal(sequence[i].address,[0x9bd6,0x9bf0,0x9c07,0x9c29,0x9c45,0x9c62,0x9c74][i]);count=run(count,255,0,0);assert.equal(count,i+1);}
for(const t of sequence){const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=t.address&255;c.m[0x11]=t.address>>8;let actual='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)actual+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>actual+=' ',0x6866:c=>c.rts()}});assert.equal(actual.replace(/\s+/g,' ').trim(),t.text);}
// The described selection prefix's full byte domain, stopped before later effects.
for(let value=0;value<256;value++){c.y=0x55;c.x=0xaa;c.a=c.nz(value);c.m[0x8ea6]=value;c.pc=0x910b;c.run({hooks:{0x913b:()=>true}});assert.equal(c.y+256*c.x,value<2?0xaa55:sequence[Math.min(value,7)-1].address);}
for(const bad of [-1,7,256,.5,NaN])assert.throws(()=>step(bad,255,0,0),RangeError);
console.log(`OK - ${checked} original first-seven manicure calls, all 256 reply-prefix values and seven original text expansions; seven live replies agree`);
