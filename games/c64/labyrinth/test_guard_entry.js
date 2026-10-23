'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardEntryData:data,labyrinthGuardEntryChoice:choice,labyrinthGuardAdvancePhase:advance}=g.run('levels.html','labyrinth-guard-entry','labyrinthGuardEntryData','labyrinthGuardEntryChoice','labyrinthGuardAdvancePhase');
const c=new CPU(Uint8Array.from(ram));
for(let column=0;column<256;column++)for(let selector=0;selector<256;selector++){
 c.m[0xaf]=column;c.m[0x8f06]=selector;let result;
 c.call(0x8ddf,{d:0},{hooks:{0x8df8:()=>{result='continue';return true;},0x8eae:()=>{result='alternate';return true;}}});
 assert.equal(choice(column,selector),result,`column${column} selector${selector}`);
}
for(let phase=0;phase<256;phase++){
 c.m[0x56a]=phase;c.call(0x8e9e,{d:0});assert.equal(advance(phase),c.m[0x56a]);
}
const live=new CPU(Uint8Array.from(ram));live.m[0x56a]=data.phase;live.m[0x8f10]=data.countdown;live.m[0x8f0d]=0;live.m[0x2c3]=0;const sounds=[],delays=[];
for(let n=0;n<data.countdown;n++){
 const old=live.m[0x8f10];live.call(0x8e70,{a:old,d:0},{hooks:{0x081e:c=>{sounds.push(c.a);c.rts();},0x0839:c=>{delays.push(c.y);c.rts();},0x8ec1:()=>{throw Error('successful countdown took alternate outcome');}}});
 assert.equal(live.m[0x8f10],old-1);assert.equal(live.m[0x56a],n===data.countdown-1?advance(data.phase):data.phase);
}
assert.deepStrictEqual(sounds,[1,13,14]);assert.deepStrictEqual(delays,[4]);assert.equal(live.m[0x2c3],5);assert.equal(live.m[0x56a],2);
assert.equal(data.column,1);assert.equal(data.selector,1);assert.equal(choice(data.column,data.selector),'continue');assert.equal(data.destination,5);assert.equal(data.entry,1);
const textCPU=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});textCPU.m[0x10]=data.reactionAddress&255;textCPU.m[0x11]=data.reactionAddress>>8;let text='';
textCPU.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>text+=' ',0x6866:c=>c.rts()}});assert.equal(text.replace(/\s+/g,' ').trim(),data.reaction);assert.equal(ram[0x9cb5],0);
for(const bad of [-1,256,.5,NaN]){assert.throws(()=>choice(bad,1),RangeError);assert.throws(()=>choice(1,bad),RangeError);assert.throws(()=>advance(bad),RangeError);}
console.log('OK - 65,536 original entry choices, 256 original phase advances, the captured nine-call successful countdown with sound/delay effects intercepted, and original entry text parse; destination/arrival established separately in VICE');
