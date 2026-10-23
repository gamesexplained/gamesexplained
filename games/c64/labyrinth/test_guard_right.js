'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardRightDoorData:d}=g.run('levels.html','labyrinth-guard-right','labyrinthGuardRightDoorData');
const {labyrinthGuardEntryChoice:choice}=g.run('levels.html','labyrinth-guard-entry','labyrinthGuardEntryChoice');
assert.equal(d.column,3);assert.equal(d.selector,1);assert.equal(choice(d.column,d.selector),'alternate');assert.equal(d.phase,1);assert.equal(d.countdown,9);
const c=new CPU(Uint8Array.from(ram));
// Run the original entry choice and alternate initializer, varying every overwritten byte.
for(let value=0;value<256;value++){
 c.m[0xaf]=d.column;c.m[0x8f06]=d.selector;c.m[0x2bb]=value;c.m[0x8f0d]=value;c.m[0x8f10]=value;const sounds=[];
 c.call(0x8ddf,{d:0},{hooks:{0x081e:c=>{sounds.push(c.a);c.rts();},0x8df8:()=>{throw Error('right-door setup took successful branch');}}});
 assert.deepStrictEqual([c.m[0x2bb],c.m[0x8f0d],c.m[0x8f10]],[0,1,d.countdown]);assert.deepStrictEqual(sounds,[1]);
}
// Every nonzero outcome must complete the actual countdown and request the losing sequence.
for(let outcome=1;outcome<256;outcome++){
 c.m[0x8f0d]=outcome;c.m[0x8f10]=d.countdown;c.m[0x56a]=d.phase;c.m[0x580]=255;c.m[0x2c3]=0;const events=[];
 const hooks={0x081e:c=>{events.push(['sound',c.a]);c.rts();},0x0827:c=>{events.push(['message',c.y+256*c.x,c.a]);c.rts();},0x0839:c=>{events.push(['delay',c.y]);c.rts();},0x0836:c=>{events.push(['clear']);c.rts();},0x0857:c=>{events.push(['description',c.y+256*c.x,c.a]);c.rts();}};
 for(let old=d.countdown;old>0;old--){c.call(0x8e70,{a:old,d:0},{hooks});assert.equal(c.m[0x8f10],old-1);assert.equal(c.m[0x580],old===1?1:255);assert.equal(c.m[0x56a],d.phase);}
 assert.deepStrictEqual(events,[['sound',1],['sound',13],['sound',18],['message',0x9e68,6],['delay',10],['sound',16],['clear'],['delay',3],['message',0x9e97,2],['delay',5],['description',0x9f44,255]]);assert.equal(c.m[0x2c3],0);
}
for(const message of d.messages){
 const textCPU=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});textCPU.m[0x10]=message.address&255;textCPU.m[0x11]=message.address>>8;let text='';
 textCPU.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>text+=' ',0x6866:c=>c.rts()}});
 assert.equal(text.replace(/\s+/g,' ').trim(),message.text);
}
assert.equal(d.stages.length,4);for(const stage of d.stages)assert(require('fs').existsSync(path.join(__dirname,'reference',stage.image)));
console.log('OK - 256 original right-entry initializations, 255 nonzero-outcome countdowns (2295 calls), exact output/delay requests and three original text expansions; ordinary-input route and loss panel recorded separately in VICE');
