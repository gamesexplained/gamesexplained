'use strict';
const assert=require('assert'),path=require('path'),crypto=require('crypto');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-06/listing.json');
const {labyrinthStoneArchStages:stages}=g.run('levels.html','labyrinth-stone-arch','labyrinthStoneArchStages');
const {labyrinthCorridorPlacement:placement}=g.run('levels.html','labyrinth-corridor','labyrinthCorridorPlacement');
assert.equal(crypto.createHash('sha256').update(ram.slice(0x543a,0x54cc)).digest('hex'),'c2874d5bb9d9612369a722f6788cb60a272fb64bc4c69ff2dd8fa261f4200207');
for(let state=0;state<256;state++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0xaf]=30;c.m[0x501]=state;c.m[0x26]=0;c.m[0x530]=255;c.m[0x532]=255;c.m[0x531]=6;c.m[0x602]=7;
 c.call(0x4115,{d:0},{hooks:{0x4210:()=>{throw Error('Stored-selector path must not draw randomness');}}});
 const index=(state&96)|15;assert.equal(c.x,index);assert.equal(c.m[0x4170],15);assert.equal(c.m[0x530],ram[0x77e+index]);assert.equal(c.m[0x532],ram[0x78e+index]);assert.equal(c.m[0x531],6);assert.equal(c.m[0x602],7);
 if(state===96)assert.deepStrictEqual([c.m[0x530],c.m[0x532]],[0,26]);
}
assert.equal(ram[0x75d],255);assert.equal(ram[0x77d],2);assert.equal(ram[0x7ed],0);assert.equal(ram[0x7fd],26);
for(let entry=0;entry<256;entry++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x26]=0;c.m.set([entry,255,30],0x5080);c.m[0x532]=entry;c.m[0x531]=6;c.m[0x602]=7;const before=[c.m[0x538]+256*c.m[0x53c],c.m[0x544]];
 c.call(0x543a,{d:0},{hooks:{0x546a:()=>{throw Error('Unexpected negative-mode placement');}}});const d=placement(entry);
 assert.deepStrictEqual([c.m[0x538]+256*c.m[0x53c],c.m[0x544]],d?[d.x,d.depth]:before);assert.equal(c.m[0x53a]+256*c.m[0x53e],1952);assert.equal(c.m[0x546],24);assert.equal(c.m[0x532],255);assert.equal(c.m[0x531],6);assert.equal(c.m[0x602],7);
 if(d){assert.equal(c.m[0x540],0);assert.equal(c.m[0x548],0);assert.equal(c.m[0x534],128);assert.equal(c.m[0x248],1);}
}
for(const [column,entry,x]of [[2,30,1952],[30,26,1696]]){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0xaf]=column;c.m[0x501]=96;c.m[0x26]=0;c.call(0x4115,{d:0});assert.equal(c.m[0x530],0);assert.equal(c.m[0x532],entry);
 c.m.set([entry,255,255],0x5080);c.call(0x543a,{d:0});assert.equal(c.m[0x538]+256*c.m[0x53c],x);assert.equal(c.m[0x544],6);assert.equal(placement(entry).x,x);
}
assert.equal(stages.length,3);assert.equal(stages[0].entry,30);assert.deepStrictEqual([stages[1].x,stages[1].depth],[1952,70]);assert.equal(stages[2].entry,26);assert.equal(stages[2].image,'stone-arch-arrival.png');
console.log('OK - 256 original archway exit-bank cases, 256 original placements including the companion-slot cases, matching resident bytes and both live request/arrival pairs; retained scene6 and opened map cell checked');
