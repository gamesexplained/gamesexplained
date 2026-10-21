'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardCongratulate:reply,labyrinthGuardCongratulations:texts,labyrinthGuardCongratulateCases:cases}=g.run('levels.html','labyrinth-guard-congratulate','labyrinthGuardCongratulate','labyrinthGuardCongratulations','labyrinthGuardCongratulateCases');
for(const[pair,pointer,action,object,target]of [[0x8b34,0x8bf4,33,44,0x90e5],[0x8b3e,0x8bfe,33,53,0x90eb],[0x8b52,0x8c12,34,44,0x913f],[0x8b60,0x8c20,34,53,0x9145],[0x8b70,0x8c30,35,44,0x913f],[0x8b76,0x8c36,35,53,0x9145]]){assert.equal(ram[pair],action);assert.equal(ram[pair+1],object);assert.equal(ram[pointer]+256*ram[pointer+1],target);}
const c=new CPU(Uint8Array.from(ram));let count=0;
function run(s){c.m[0x56a]=s.phase;c.m[0x8f0c]=s.flag;c.m[0x8f05]=99;c.m[0x8f07]=s.second;c.m[0x8f08+s.speaker]=s.asked;c.m[0x8f09-s.speaker]=73;c.m[0x8f0a]=s.selection;c.m[0x53e]=s.speaker;c.m[0xaf]=s.speaker===0?1:3;let outputs=[];
 c.call(s.speaker===0?0x90e5:0x90eb,{d:0},{hooks:{0x0812:c=>{c.a=c.nz(0);c.rts();},0x0827:c=>{outputs.push(c.y+256*c.x);assert.equal(c.a,s.speaker===0?6:32);c.rts();}}});
 const d=reply(s);assert.deepStrictEqual(outputs,[d.address]);assert.equal(c.m[0x8f0c],d.flag);assert.equal(c.m[0x8f0a],d.selection);assert.equal(c.m[0x8f05],s.speaker);assert.equal(c.m[0x8f08+s.speaker],s.asked);assert.equal(c.m[0x8f09-s.speaker],73);count++;return d;
}
for(let speaker=0;speaker<2;speaker++)for(let phase=0;phase<256;phase++)for(const flag of [0,127,128,255])for(const asked of [0,1])for(const second of [0,1])run({phase,flag,speaker,asked,second,selection:201});
for(let speaker=0;speaker<2;speaker++)for(let flag=0;flag<256;flag++)for(const phase of [1,4])for(const asked of [0,1])for(const second of [0,1])run({phase,flag,speaker,asked,second,selection:201});
for(let speaker=0;speaker<2;speaker++)for(let asked=0;asked<256;asked++)for(const flag of [0,127,128,255])for(const second of [0,1])run({phase:4,flag,speaker,asked,second,selection:201});
for(let speaker=0;speaker<2;speaker++)for(let second=0;second<256;second++)for(const asked of [0,1])for(const flag of [0,255])run({phase:4,flag,speaker,asked,second,selection:201});
for(const trial of cases){const d=run(trial.state);assert.equal(d.address,trial.expected);assert.ok(g.read('levels.html').includes(trial.image));}
// Retain the insult's real output call and subsequent flag store, then congratulate twice.
for(let speaker=0;speaker<2;speaker++)for(let flag=0;flag<256;flag++){
 const d=new CPU(Uint8Array.from(ram));d.m[0x53e]=speaker;d.m[0xaf]=speaker===0?1:3;d.m[0x56a]=4;d.m[0x8f08+speaker]=1;d.m[0x8f07]=speaker;d.m[0x8f0c]=flag;let outputs=[];
 const hooks={0x0812:c=>{c.a=c.nz(0);c.rts();},0x0827:c=>{outputs.push(c.y+256*c.x);c.rts();}};
 d.call(speaker===0?0x913f:0x9145,{d:0},{hooks});assert.equal(d.m[0x8f0c],255);
 d.call(speaker===0?0x90e5:0x90eb,{d:0},{hooks});assert.equal(d.m[0x8f0c],0);
 d.call(speaker===0?0x90e5:0x90eb,{d:0},{hooks});assert.equal(d.m[0x8f0a],speaker);assert.deepStrictEqual(outputs,[0x9e58,0x9d9c,0x9d2c]);
}
for(const text of texts){const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=text.address&255;c.m[0x11]=text.address>>8;let actual='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)actual+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>actual+=' ',0x6866:c=>c.rts()}});assert.equal(actual.replace(/\s+/g,' ').trim(),text.text);}
const valid={phase:4,flag:0,speaker:0,asked:1,second:0,selection:255};
for(const key of Object.keys(valid))for(const bad of [-1,256,.5,NaN])assert.throws(()=>reply({...valid,[key]:bad}),RangeError);
assert.throws(()=>reply({...valid,speaker:2}),RangeError);
console.log(`OK - ${count} original congratulations cases through both accepted prerequisites, 512 original insult/repeated-congratulations sequences, six reply expansions and six command aliases; ordinary phase progression remains open`);
