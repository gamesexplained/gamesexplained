'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-05/listing.json');
const {labyrinthWallAsk:ask,labyrinthWallAutomatic:automatic,labyrinthWallReplies:replies}=g.run('levels.html','labyrinth-wall-ask','labyrinthWallAsk','labyrinthWallAutomatic','labyrinthWallReplies');
assert.equal(ram[0x8b14],30);assert.equal(ram[0x8b15],54);assert.equal(ram[0x8bd4]+256*ram[0x8bd5],0x903d);
const c=new CPU(Uint8Array.from(ram));let keyed=0,auto=0;
function run(index,gate,local,flag){c.m[0x8ea5]=index;c.m[0x343]=gate;c.m[0x8e9f]=local;if(flag!==undefined)c.m[0x8eaf]=flag;const outputs=[];const d=flag===undefined?ask(index,gate,local):automatic(flag,index,gate,local);
 c.call(flag===undefined?0x903d:0x8de4,{d:0},{hooks:{0x0827:c=>{outputs.push({address:c.y+256*c.x,mode:c.a});c.rts();},0x8def:()=>true}});
 assert.deepStrictEqual(outputs,d.address===null?[]:[{address:d.address,mode:d.mode}]);assert.equal(c.m[0x8ea5],d.next);assert.equal(c.m[0x8e9f],d.local);assert.equal(c.m[0x343],gate);if(flag!==undefined){assert.equal(c.m[0x8eaf],d.flag);auto++;}else keyed++;return d;
}
for(let index=0;index<5;index++)for(let gate=0;gate<256;gate++)for(const local of [0,255])run(index,gate,local);
for(let index=0;index<5;index++)for(let gate=0;gate<256;gate++)for(let flag=0;flag<256;flag++)run(index,gate,123,flag);
let d=run(0,255,0,255);assert.equal(d.address,0x9913);assert.equal(d.flag,0);let index=d.next,local=d.local;
for(const address of [0x9966,0x9973,0x998c,0x99b1,0x9913]){d=run(index,255,local);assert.equal(d.address,address);index=d.next;local=d.local;}
for(let i=0;i<5;i++){assert.equal(replies[i].address,ram[0x906b+i]+256*ram[0x9066+i]);assert.equal(replies[i].local,ram[0x9061+i]);}
for(const t of [...replies,{address:0x95ce,text:'Nothing happens.'}]){const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=t.address&255;c.m[0x11]=t.address>>8;let actual='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)actual+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>actual+=' ',0x6866:c=>c.rts()}});assert.equal(actual.replace(/\s+/g,' ').trim(),t.text);}
for(const bad of [-1,5,.5,NaN])assert.throws(()=>ask(bad,255,0),RangeError);
for(const bad of [-1,256,.5,NaN]){assert.throws(()=>ask(0,bad,0),RangeError);assert.throws(()=>ask(0,255,bad),RangeError);assert.throws(()=>automatic(bad,0,255,0),RangeError);}
console.log(`OK - ${keyed} original ASK/gate cases, ${auto} original automatic-prefix cases and six text expansions; automatic opening plus five manual replies match the live sequence`);
