'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-06/listing.json');
const {labyrinthStoneLadderGate:gate,labyrinthStoneLadderStages:stages}=g.run('levels.html','labyrinth-stone-ladder','labyrinthStoneLadderGate','labyrinthStoneLadderStages');
const c=new CPU(Uint8Array.from(ram));let checked=0;
function run(x,type=4,mode=255,state=255){const d=gate(x,type,mode,state);c.m[0x538]=x&255;c.m[0x53c]=x>>8;c.m[0xb0]=type;c.m[0x343]=mode;c.m[0x3420]=state;let accepted=false;c.call(0x3796,{x:13,y:7,d:0},{hooks:{0x37ae:()=>{accepted=true;}}});assert.equal(accepted,d.accepted);assert.equal(c.m[0x3420],d.state);assert.equal(c.x,13);assert.equal(c.y,7);assert.equal(c.m[0x538]+256*c.m[0x53c],x);checked++;}
for(let x=0;x<65536;x++)run(x);
for(let type=0;type<256;type++)for(let mode=0;mode<256;mode++)run(1633,type,mode,170);
for(let state=0;state<256;state++){run(1633,4,255,state);run(1641,4,255,state);}
for(const row of stages)if(row.x!==undefined)run(row.x);
for(let state=0;state<256;state++){c.m[0x3420]=state;let calls=0,active=false;c.call(0x3c83,{y:0,d:0},{hooks:{0x3df1:c=>{calls++;assert.equal(c.a,state);assert.equal(c.y,0);c.rts();},0x3c8e:()=>true,0x3cab:()=>{active=true;return true;}}});assert.equal(calls,state<128?1:0);assert.equal(active,state<128);}
assert.equal(ram[0x619],3);assert.equal(ram[0x741],4);assert.equal(ram[0x77b],0);assert.equal(ram[0x78b],5);assert.equal(ram[0x79b],1);
// Run the actual gate, classifier, complete climb and exit for every accepted offset.
for(let offset=28;offset<36;offset++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0x26]=0;c.m[0x5e]=255;c.m[0x538]=(1600+offset)&255;c.m[0x53c]=(1600+offset)>>8;c.m[0x3420]=255;c.m[0x218]=77;c.m[0x531]=6;c.m[0x530]=255;c.m[0x532]=255;
 c.call(0x998,{d:0});assert.equal(c.x,4);assert.equal(c.y,25);c.call(0x3796,{d:0});assert.equal(c.m[0x3420],0);
 let calls=0;do{const state=c.m[0x3420];c.call(0x3df1,{a:state,y:0,d:0});assert(++calls<=30);}while(c.m[0x3420]<128);
 assert.equal(calls,23);assert.equal(c.m[0x3420],255);assert.equal(c.m[0x218],0);assert.equal(c.m[0x21c],0);assert.equal(c.m[0x544],12);assert.equal(c.m[0x548],0);assert.equal(c.m[0x293],0);assert.equal(c.m[0x530],5);assert.equal(c.m[0x532],1);assert.equal(c.m[0x531],6);assert.equal(c.m[0x538]+256*c.m[0x53c],offset<32?1631:1632);
}
// The addition is modulo256: high starting values can wrap below the exit threshold.
for(let vertical=0;vertical<256;vertical++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0x26]=0;c.m[0xaf]=25;c.m[0x3420]=1;c.m[0x218]=vertical;c.m[0x21c]=17;c.m[0x544]=24;c.m[0x548]=0;c.m[0x293]=9;c.m[0x538]=97;c.m[0x53c]=6;c.m[0x530]=255;c.m[0x532]=255;
 c.call(0x3df1,{a:1,y:0,d:0});const next=(vertical+6)&255,exit=next>=128;assert.equal(c.m[0x218],exit?0:next);assert.equal(c.m[0x3420],exit?255:2);assert.equal(c.m[0x544],exit?12:24);assert.equal(c.m[0x293],exit?0:9);assert.equal(c.m[0x21c],exit?0:17);assert.equal(c.m[0x530],exit?5:255);assert.equal(c.m[0x532],exit?1:255);assert.equal(c.m[0x538]+256*c.m[0x53c],1632);
}
assert.equal(gate(1641).accepted,false);assert.equal(gate(1637).accepted,false);assert.equal(gate(1633).accepted,true);assert.equal(stages[3].image,'stone-ladder-hands.png');
for(const bad of [-1,65536,.5,NaN])assert.throws(()=>gate(bad),RangeError);for(const bad of [-1,256,.5,NaN])for(let i=1;i<4;i++){const args=[1633,4,255,255];args[i]=bad;assert.throws(()=>gate(...args),RangeError);}
console.log(`OK - ${checked} original ladder alignment calls, 256 dispatch states, eight complete23-call climbs and 256 drawing-byte boundaries; real classifier/exit requests5/1, and actual destination is checked in VICE`);
