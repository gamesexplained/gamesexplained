'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/c64/cpu6502.js'));
const g=game(__dirname),{ram,has}=g.listing('parts/scene-01/listing.json');
const {labyrinthGateCells:cells,labyrinthGateTypes:types,labyrinthGateLimits:limits,labyrinthGateApproach:approach}=g.run('index.html','labyrinth-gate','labyrinthGateCells','labyrinthGateTypes','labyrinthGateLimits','labyrinthGateApproach');
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
