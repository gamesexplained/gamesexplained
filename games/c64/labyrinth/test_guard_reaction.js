'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardReaction:reaction,labyrinthGuardReactionTexts:texts,labyrinthGuardReactionTrials:trials}=g.run('levels.html','labyrinth-guard-reaction','labyrinthGuardReaction','labyrinthGuardReactionTexts','labyrinthGuardReactionTrials');
const c=new CPU(Uint8Array.from(ram));let count=0;
const base={depth:54,gate:255,reactionDepth:54,countdownDepth:64,selection:0,second:0,speaker:0,move:77,outcome:88,countdown:99};
function run(s,column=1){
 for(const[a,v]of [[0x56a,4],[0x544,s.depth],[0x8f0b,s.gate],[0x8f0e,s.reactionDepth],[0x8f0f,s.countdownDepth],[0x8f0a,s.selection],[0x8f07,s.second],[0x8f05,s.speaker],[0x2bb,s.move],[0x8f0d,s.outcome],[0x8f10,s.countdown],[0xaf,column],[0x341,41],[0x342,42],[0x8f01,43],[0x8f02,44]])c.m[a]=v;
 let outputs=[];c.call(0x8df8,{d:0},{hooks:{0x0827:c=>{outputs.push({address:c.y+256*c.x,mode:c.a});c.rts();}}});const d=reaction(s);
 assert.deepStrictEqual(outputs,d.address===null?[]:[{address:d.address,mode:d.speaker===0?(column===1?6:0):32}]);
 for(const [key,a]of [['speaker',0x8f05],['gate',0x8f0b],['move',0x2bb],['outcome',0x8f0d],['countdown',0x8f10]])assert.equal(c.m[a],d[key],key);
 assert.equal(c.m[0x8f0a],s.selection);assert.equal(c.m[0x56a],4);
 assert.deepStrictEqual([c.m[0x341],c.m[0x342],c.m[0x8f01],c.m[0x8f02]],d.address===null?[41,42,43,44]:d.speaker===0?[5,column===1?6:0,12,44]:[7,32,43,12]);count++;return d;
}
// Byte-domain gate/depth sweep, independent of whether the countdown threshold is crossed.
for(let gate=0;gate<256;gate++)for(let depth=0;depth<256;depth++)run({...base,gate,depth});
// Full byte pairs include both valid guards and negative unselected values, without reachability claims.
for(let selection=0;selection<256;selection++)for(let second=0;second<256;second++)run({...base,selection,second});
for(let threshold=0;threshold<256;threshold++)for(const depth of [0,40,44,54,64,255])for(const gate of [0,255]){
 run({...base,reactionDepth:threshold,depth,gate});run({...base,countdownDepth:threshold,depth,gate});
}
for(let speaker=0;speaker<256;speaker++)for(const column of [1,3])run({...base,selection:255,speaker},column);
for(const trial of trials){const d=run(trial.state);assert.ok(texts.find(t=>t.address===d.address));assert.equal(d.countdown,255);assert.equal(d.gate,0);}
for(let phase=0;phase<256;phase++){
 const s=new CPU(Uint8Array.from(ram));s.m[0x56a]=phase;s.m[0x8f0e]=123;s.m[0x8f0f]=234;
 s.call(0x8f37,{d:0},{hooks:{0x8f48:()=>true}});assert.deepStrictEqual([s.m[0x8f0e],s.m[0x8f0f]],phase>=2?[54,64]:[123,234]);
}
for(const t of texts){const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=t.address&255;c.m[0x11]=t.address>>8;let actual='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)actual+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>actual+=' ',0x6866:c=>c.rts()}});assert.equal(actual.replace(/\s+/g,' ').trim(),t.text);}
assert.equal(ram[0x9e0f],0);assert.equal(ram[0x9e57],0);
for(const key of Object.keys(base))for(const bad of [-1,256,.5,NaN])assert.throws(()=>reaction({...base,[key]:bad}),RangeError);
console.log(`OK - ${count} original phase4 reaction cases with real speaker helpers, 256 original setup threshold cases and three original text expansions; movement and later-phase arrival remain separate live evidence`);
