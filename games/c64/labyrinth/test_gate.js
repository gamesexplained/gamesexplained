'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram,has}=g.listing('parts/scene-01/listing.json');
const {labyrinthGateCells:cells,labyrinthGateTypes:types,labyrinthGateLimits:limits,labyrinthGateApproach:approach}=g.run('levels.html','labyrinth-gate','labyrinthGateCells','labyrinthGateTypes','labyrinthGateLimits','labyrinthGateApproach');
for(const [start,values] of [[0x600,cells],[0x73e,types],[0x41f0,limits]])for(let i=0;i<values.length;i++){assert(has[start+i]);assert.equal(values[i],ram[start+i]);}
const caps=[];
for(let x=0;x<256;x++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0x5e]=255;c.m[0x538]=x;c.m[0x53c]=0;c.call(0x4171,{d:0});caps[x]=c.m[0xb2];
 const a=approach(x,0);assert.equal(a.column,c.m[0xaf]);assert.equal(a.type,c.m[0xb0]);assert.equal(a.limit,c.m[0xb2]);
}
const starts=[];
for(let depth=0;depth<256;depth++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x544]=depth;c.m[0x8ed3]=255;c.m[0x73e]=2;c.m[0x740]=2;c.call(0x8d92,{d:0});starts[depth]=c.m[0x8ed3]===0;
 assert.equal(starts[depth],depth>=50&&depth<128);if(starts[depth]){assert.equal(c.m[0x73e],14);assert.equal(c.m[0x740],14);}
}
for(let x=0;x<256;x++)for(let d=0;d<256;d++)assert.equal(approach(x,d).canStart,d<=caps[x]&&starts[d]);
// Exercise the gate's deferred request, not the unrelated generic exit path.
{
 const c=new CPU(Uint8Array.from(ram));c.m[0x8ed3]=2;const calls=[];c.call(0x8cc0,{d:0},{hooks:{0x081e:c=>{calls.push(c.a);c.rts();},0x0a6d:c=>{calls.push(c.a);c.rts();}}});
 assert.deepStrictEqual(calls,[5,60,60,60,60]);assert.equal(c.m[0x2c3],2);assert.equal(c.m[0x2b7],255);assert.equal(c.m[0x8ed3],3);
}
for(const pending of [255,0,3])for(const entry of [255,5]){
 const c=new CPU(Uint8Array.from(ram));c.m[0x2c3]=2;c.m[0x530]=pending;c.m[0x532]=entry;const calls=[];
 c.call(0x59af,{d:0},{hooks:{0x60e6:c=>{calls.push(0x60e6);c.rts();},0x5098:c=>{calls.push(0x5098);return true;}}});
 assert.equal(c.m[0x530],pending===255?2:pending);assert.equal(c.m[0x532],pending===255&&entry===255?1:entry);assert.equal(c.m[0x2c3],255);assert.deepStrictEqual(calls,[0x60e6,0x5098]);
}
console.log('OK - 256 original column classifications, 256 original threshold cases, 65,536 combined candidates and seven deferred-scene cases');
// Stored speech and the shared sequence scheduler, without simulating its artwork.
const {labyrinthGateSpeech:speech}=g.run('levels.html','labyrinth-gate-speech','labyrinthGateSpeech');
assert.equal(speech.length,7);
for(let i=0;i<7;i++){
 const r=speech[i];assert.equal(r.address,ram[0x8ed4+i]+256*ram[0x8edb+i]);assert.equal(r.countdown,ram[0x8ec5+i]);assert.equal(ram[r.end],0);
 const c=new CPU(Uint8Array.from(ram));c.m[0x10]=(r.address+2)&255;c.m[0x11]=(r.address+2)>>8;let text='';
 c.call(0x67b5,{d:0},{hooks:{0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x6866:c=>c.rts()}});
 assert.equal(text.replace(/\s+/g,' ').trim(),r.text);
}
let schedulerCases=0;
for(let phase=0;phase<15;phase++)for(let timer=0;timer<256;timer++)for(const scene of [0,1])for(const interrupt of [0,255]){
 const c=new CPU(Uint8Array.from(ram));c.m[0x8eb4]=phase;c.m[0x8eb5]=timer;c.m[0x531]=scene;c.m[0x30b]=interrupt;c.m[0x8e07]=255;c.m[0x544]=0;c.m[0x8ed3]=255;
 c.m.set([65,66,0],0x504);let ptr=null,cleared=0;
 const hooks={};for(const a of [0x8ea4,0x8e29,0x0824,0x0818,0x081b,0x081e,0x086f])hooks[a]=c=>c.rts();
 hooks[0x086c]=c=>{cleared++;c.rts();};hooks[0x0803]=c=>{ptr=c.m[0x10]+256*c.m[0x11];c.rts();};
 c.call(0x8cd8,{d:0},{hooks});
 let next=phase,remaining=timer,message=null;
 if(phase<14){if(phase<7&&interrupt===255){next=7;remaining=1;assert.equal(cleared,1);}
 else {remaining=(timer-1)&255;if(remaining===0){const selected=phase===0&&scene!==0?7:phase;remaining=ram[0x8ec5+selected];if(selected<7)message=speech[selected].address;next=selected+1;}}}
 assert.equal(c.m[0x8eb4],next);assert.equal(c.m[0x8eb5],remaining);assert.equal(ptr,message);assert.equal(c.m[0x8ed3],255);
 if(phase===0&&timer===1&&scene===0&&interrupt===0)assert.deepStrictEqual(Array.from(c.m.slice(0x8f22,0x8f26)),[65,66,46,0]);schedulerCases++;
}
console.log(`OK - seven original speech parses and ${schedulerCases} original phase/countdown decisions, including name insertion and scene-dependent skip`);
for(let sample=0;sample<32;sample++)for(let latch=0;latch<256;latch++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x30c]=sample;c.m[0x30b]=latch;let queued=0;
 c.call(0x1993,{d:0},{hooks:{0x18db:c=>{queued++;c.rts();}}});
 assert.equal(c.m[0x30b],sample&16?(latch||255):0);assert.equal(queued,Boolean(sample&16)&&latch===0?1:0);
}
console.log('OK - 8,192 original fire-latch cases: press, hold, release and re-press');
