'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthAlphAsk:ask,labyrinthRalphCall:call,labyrinthGuardSwitchActions:actions}=g.run('levels.html','labyrinth-alph-conversation','labyrinthAlphAsk','labyrinthRalphCall','labyrinthGuardSwitchActions');
for(const [pair,target,address,action] of [[0x8b14,0x8bd4,0x8fae,30],[0x8b28,0x8be8,0x90cc,31]]){assert.equal(ram[pair],action);assert.equal(ram[pair+1],53);assert.equal(ram[target]+256*ram[target+1],address);}
for(const [handler,column,presence,speaker,mode] of [[0x8fa8,1,0,0,6],[0x8fae,3,1,1,32]])for(let progress=0;progress<15;progress++)for(let index=0;index<3;index++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x8f04]=index;c.m[0x8f0c]=0;c.m[0x569]=progress;c.m[0x53e]=presence;c.m[0xaf]=column;let actual;
 c.call(handler,{d:0},{hooks:{0x0812:c=>{c.a=c.nz(0);c.rts();},0x0827:c=>{actual={address:c.y+256*c.x,next:c.m[0x8f04]};assert.equal(c.a,mode);return true;}}});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(ask(index))),actual);assert.equal(c.m[0x8f05],speaker);
}
for(let index=0;index<3;index++)for(let presence=0;presence<256;presence++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x8f04]=index;let actual;
 c.call(0x90cc,{d:0},{hooks:{0x93d1:c=>{c.a=c.nz(presence);c.rts();},0x0827:c=>{actual={address:c.y+256*c.x,next:c.m[0x8f04]};assert.equal(c.a,32);return true;}}});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(call(index,presence))),actual);
}
assert.deepStrictEqual(JSON.parse(JSON.stringify(actions)),[{action:31,object:53,presence:1},{action:30,object:53}]);
let index=ask(0).next;assert.equal(index,1);index=call(index,actions[0].presence).next;assert.equal(index,1);const final=ask(index);assert.equal(final.address,0x9adc);assert.equal(final.next,2);
for(const value of [-1,256,1.5,NaN])assert.throws(()=>call(1,value),RangeError);
console.log('OK - 90 original ASK decisions through both real prerequisites with accepted distance/actor states; 768 original CALL RALPH decisions; page speaker-switch inputs and shared index');
