'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-06/listing.json');
const {labyrinthStoneClose:close,labyrinthStoneDoorData:data,labyrinthStoneDoorCases:cases}=g.run('levels.html','labyrinth-stone-door','labyrinthStoneClose','labyrinthStoneDoorData','labyrinthStoneDoorCases');
assert.deepStrictEqual([ram[0x8b2e],ram[0x8b2f]],[32,45]);assert.equal(ram[0x8bee]+256*ram[0x8bef],0x8e91);assert.deepStrictEqual(data.closeReplacements,[...ram.slice(0x72e,0x73e)]);
const c=new CPU(Uint8Array.from(ram));let checked=0;
function run(x,cell){const d=close(x,cell),sounds=[],outputs=[];
 c.m.fill(0,0x400,0x4fe);c.m[0x343]=255;c.m[0x5e]=255;c.m[0x538]=x&255;c.m[0x53c]=x>>8;c.m[0x531]=6;c.m[0x530]=255;c.m[0x600+d.column]=cell;
 c.call(0x8e91,{d:0},{hooks:{0x081e:c=>{sounds.push(c.a);c.rts();},0x0827:c=>{outputs.push([c.y+256*c.x,c.a]);c.rts();}}});
 assert.equal(c.m[0xaf],d.column);assert.equal(c.m[0xb0],d.type);assert.equal(c.m[0x600+d.column],d.value);assert.equal(c.m[0x531],6);assert.equal(c.m[0x530],d.pending===null?255:0);assert.deepStrictEqual(sounds,d.sound===null?[]:[d.sound]);assert.deepStrictEqual(outputs,d.address===null?[]:[[d.address,5]]);
 if(d.kind==='close')assert.deepStrictEqual([c.m[0x400],c.m[0x455],c.m[0x4aa]],[6,d.column,d.value]);else assert(c.m.slice(0x400,0x4fe).every(x=>x===0));checked++;
}
for(let x=0;x<65536;x++)run(x,7);
for(let cell=0;cell<256;cell++)for(const x of [0,63,64,147,480,1536,1599,65535])run(x,cell);
for(let mode=0;mode<128;mode++){c.m[0x343]=mode;const outputs=[];c.call(0x8e91,{d:0},{hooks:{0x0818:()=>{throw Error('Unexpected query in nonnegative mode');},0x0827:c=>{outputs.push([c.y+256*c.x,c.a]);c.rts();}}});assert.deepStrictEqual(outputs,[[0x93d0,5]]);}
for(const row of cases.filter(r=>r.action==='close'))run(row.x,row.cell);
assert.equal(close(147,7).value,1);assert.equal(close(147,1).address,0x9205);
// Run the full generic exit routine for the live column and all stored bank bytes.
for(let state=0;state<256;state++){
 c.m[0x343]=255;c.m[0xaf]=2;c.m[0x501]=state;c.m[0x26]=0;c.m[0x530]=255;c.m[0x532]=255;c.m[0x531]=6;
 c.call(0x4115,{d:0},{hooks:{0x4210:()=>{throw Error('Stored-selector path must not draw randomness');}}});
 const index=(state&96)|1;assert.equal(c.x,index);assert.equal(c.m[0x4170],1);assert.equal(c.m[0x530],ram[0x77e+index]);assert.equal(c.m[0x532],ram[0x78e+index]);assert.equal(c.m[0x531],6);
 if(state===96)assert.deepStrictEqual([c.m[0x530],c.m[0x532]],[0,30]);
}
assert.equal(ram[0x76f],2);assert.equal(ram[0x7df],0);assert.equal(ram[0x7ef],30);assert.equal(cases.at(-1).x,1952);assert(cases.at(-1).caption.includes('refresh0/entry30'));
{const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=5;c.m[0x11]=0x92;let text='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>text+=' ',0x6866:c=>c.rts()}});assert.equal(text.replace(/\s+/g,' ').trim(),"It's already closed.");}
for(const bad of [-1,65536,.5,NaN])assert.throws(()=>close(bad,7),RangeError);for(const bad of [-1,256,.5,NaN])assert.throws(()=>close(147,bad),RangeError);
console.log(`OK - ${checked} original CLOSE calls, 128 nonnegative-mode refusals, 256 column2 exit bank cases and original already-closed text; live7→1 close and refresh0/entry30 crossing agree`);
