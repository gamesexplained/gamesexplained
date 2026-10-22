'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-05/listing.json');
const {labyrinthWallFirstManicure:compare,labyrinthWallManicureTexts:texts,labyrinthWallManicureCases:cases}=g.run('levels.html','labyrinth-wall-manicure','labyrinthWallFirstManicure','labyrinthWallManicureTexts','labyrinthWallManicureCases');
assert.deepStrictEqual([ram[0x8b74],ram[0x8b75]],[36,54]);assert.equal(ram[0x8c34]+256*ram[0x8c35],0x90e2);
const c=new CPU(Uint8Array.from(ram));let checked=0;
function run(gate,item,damage,draws=[7]){
 const d=compare(gate,item,damage),outputs=[],sounds=[];let queries=0,random=0;
 c.m[0x343]=gate;c.m[0x673e]=item;c.m[0x56c]=damage;c.m[0x8ea6]=0;c.m[0x8e9f]=7;c.m[0x356]=3;c.m[0x8ea3]=4;c.m[0x8eaa]=5;c.m[0x342]=70;
 c.call(0x90e2,{d:0},{hooks:{0x0aa8:()=>{queries++;},0x081e:c=>{sounds.push(c.a);c.rts();},0x0821:c=>{assert(random<draws.length,'random loop exhausted');c.a=c.nz(draws[random++]);c.rts();},0x0827:c=>{outputs.push({address:c.y+256*c.x,mode:c.a});c.rts();}}});
 const mode=d.mode==='varied'?11+(draws[draws.length-1]&15):d.mode;
 assert.deepStrictEqual(outputs,[{address:d.address,mode}]);assert.equal(c.m[0x8ea6],d.counter);assert.equal(c.m[0x673e],item);assert.equal(c.m[0x56c],damage);assert.equal(c.m[0x343],gate);
 assert.equal(c.m[0x8e9f],d.local===null?7:d.local);assert.deepStrictEqual([c.m[0x356],c.m[0x8ea3],c.m[0x8eaa]],d.animation||[3,4,5]);assert.deepStrictEqual(sounds,d.sound===null?[]:[d.sound]);assert.equal(queries,gate<128?0:1);assert.equal(random,d.kind==='usable'?draws.length:0);assert.equal(c.m[0x342],d.kind==='usable'?mode:70);checked++;return {address:d.address,counter:d.counter,mode};
}
for(let gate=0;gate<256;gate++)for(const item of [0,127,128,255])for(const damage of [0,127,128,255])run(gate,item,damage);
for(let item=0;item<256;item++)for(let damage=0;damage<256;damage++)run(255,item,damage);
for(let draw=0;draw<256;draw++)if((draw&15)<14)run(255,0,0,[draw]);
run(255,0,0,[14,15,30,255,7]);
for(const trial of cases){const expected={missing:{address:0x9ca3,counter:0,mode:21},usable:{address:0x9bd6,counter:1,mode:18},damaged:{address:0x98b0,counter:0,mode:5}};assert.deepStrictEqual(run(trial.gate,trial.item,trial.damage),expected[trial.key]);}
for(const t of texts){const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=t.address&255;c.m[0x11]=t.address>>8;let actual='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)actual+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>actual+=' ',0x6866:c=>c.rts()}});assert.equal(actual.replace(/\s+/g,' ').trim(),t.text);}
for(const bad of [-1,256,.5,NaN])for(let i=0;i<3;i++){const args=[255,0,0];args[i]=bad;assert.throws(()=>compare(...args),RangeError);}
console.log(`OK - ${checked} original first-manicure cases, random retry checks and four text expansions; three page comparisons match the live trials`);
