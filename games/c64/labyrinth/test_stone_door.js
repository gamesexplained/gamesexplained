'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-06/listing.json');
const {labyrinthStoneOpen:open,labyrinthStoneDoorData:data,labyrinthStoneDoorCases:cases}=g.run('levels.html','labyrinth-stone-door','labyrinthStoneOpen','labyrinthStoneDoorData','labyrinthStoneDoorCases');
assert.deepStrictEqual([ram[0x8b8a],ram[0x8b8b]],[37,45]);assert.equal(ram[0x8c4a]+256*ram[0x8c4b],0x8f30);assert.deepStrictEqual(data.types,[...ram.slice(0x73e,0x74e)]);assert.deepStrictEqual(data.replacements,[...ram.slice(0x71e,0x72e)]);
const c=new CPU(Uint8Array.from(ram));let checked=0;
function run(x,cell,depth=6){const d=open(x,cell),outputs=[],sounds=[];let special=false;
 c.m.fill(0,0x400,0x4fe);c.m[0x343]=255;c.m[0x5e]=data.mask;c.m[0x538]=x&255;c.m[0x53c]=x>>8;c.m[0x544]=depth;c.m[0x531]=6;c.m[0x530]=255;c.m[0x600+d.column]=cell;
 c.call(0x8f30,{d:0},{hooks:{0x081e:c=>{sounds.push(c.a);c.rts();},0x0827:c=>{outputs.push({address:c.y+256*c.x,mode:c.a});c.rts();},0x8f5a:()=>{special=true;return true;}}});
 assert.equal(special,d.kind==='special');assert.equal(c.m[0xaf],d.column);assert.equal(c.m[0xb0],d.type);const auxiliary=d.type<128?d.type:0;assert.equal(c.m[0xb2],ram[0x41f0+auxiliary]);assert.equal(c.m[0xb3],ram[0x4200+auxiliary]);assert.equal(c.m[0x600+d.column],d.value);assert.equal(c.m[0x531],6);assert.equal(c.m[0x530],d.pending===null?255:d.pending);assert.deepStrictEqual(sounds,d.sound===null?[]:[d.sound]);assert.deepStrictEqual(outputs,d.address===null?[]:[{address:d.address,mode:5}]);
 if(d.kind==='open'){assert.equal(c.m[0x400],6);assert.equal(c.m[0x455],d.column);assert.equal(c.m[0x4aa],d.value);}else assert(c.m.slice(0x400,0x4fe).every(x=>x===0));checked++;
}
for(let x=0;x<65536;x++)run(x,1);
for(let cell=0;cell<256;cell++)for(const x of [0,63,64,147,480,1536,1599,65535])run(x,cell);
for(let depth=0;depth<256;depth++)for(const [x,cell]of [[480,0],[147,1],[147,7]])run(x,cell,depth);
for(let mode=0;mode<128;mode++){c.m[0x343]=mode;const outputs=[];let delegated=false;c.call(0x8f30,{d:0},{hooks:{0x9c56:()=>{delegated=true;return true;},0x0827:c=>{outputs.push([c.y+256*c.x,c.a]);c.rts();}}});assert.equal(delegated,mode!==1);assert.deepStrictEqual(outputs,mode===1?[[0x93d0,5]]:[]);}
for(const row of cases)if(row.command&&row.action!=='close')run(row.x,row.cell);
assert.equal(open(480,0).address,0x93d0);assert.equal(open(147,1).value,7);assert.equal(open(147,7).address,0x91ef);
for(const [address,text]of [[0x93d0,'Nothing happens.'],[0x91ef,"It's already opened."]]){const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=address&255;c.m[0x11]=address>>8;let actual='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)actual+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>actual+=' ',0x6866:c=>c.rts()}});assert.equal(actual.replace(/\s+/g,' ').trim(),text);}
for(const bad of [-1,65536,.5,NaN])assert.throws(()=>open(bad,1),RangeError);for(const bad of [-1,256,.5,NaN])assert.throws(()=>open(147,bad),RangeError);
console.log(`OK - ${checked} original Stone Corridor OPEN cases, real classifier/mutation/record path, 128 mode-prefix cases and two original text expansions; arrival, nearby opening and repeated-open live cases agree`);
