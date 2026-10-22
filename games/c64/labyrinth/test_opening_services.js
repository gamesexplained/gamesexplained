'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=require('./opening_image.js')(g);
const pairs=[[0x13c8,0x13e8,0x81,0x63,0x1430],[0x1479,0x1499,0x85,0x77,0x14d7],[0x1520,0x1540,0x89,0x8b,0x157e],[0x15c7,0x15e7,0x8d,0x9f,0x1625],[0x166e,0x168e,0x91,0xb3,0x16cc],[0x1715,0x1735,0x95,0xcf,0x1773]];
for(const [two,three,base,line,next] of pairs)for(const group of [2,3])for(const y of [0,93,255]){
 const writes=new Map(),c=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25},io:{write(a,v){writes.set(a,v);},read(){return 0;}}});
 c.m[base]=0x80;c.m[base+1]=0x90;c.m[base+2]=0xa0;c.m[0x61]=0x25;c.m[0x71]=255;
 const entry=group===2?two:three;let end=entry;while(c.m[end]!==0x40)end++;
 c.call(entry,{y,d:0},{hooks:{[end]:()=>true}});
 const want=group===2?[0x80,0x81,0x90,0x91,0xa0,0xa1]:[0x80,0x81,0x82,0xa0,0xa1,0xa2];
 assert.deepStrictEqual(Array.from(c.m.slice(0xcff8,0xcffe)),want);assert.equal(c.y,y);assert.equal(writes.get(0xd012),line);assert.equal(c.m[0xfffe]+256*c.m[0xffff],next);assert.equal(writes.get(0xd019),0x81);
}
const word=i=>{let a=ram[0xd900+i]+256*ram[0xd800+i],s='';while(ram[a])s+=String.fromCharCode(ram[a++]);return s;};
let checks=0;
for(let i=0;i<9;i++){
 const name=word(ram[0x8f8b+i]).toUpperCase();
 for(const input of [name,name+'X',name.toLowerCase(),name.slice(0,-1)]){
  const c=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25}});c.m.fill(0,0x6683,0x66a3);c.m.set(Buffer.from(input),0x6683);c.m[0x6682]=input.length;c.m[0x8f94]=6;
  c.call(0x8f1d,{d:0});const match=input.startsWith(name);assert.equal(Boolean(c.m[0x8c83]&&c.m[0x8f94]<9),match,`${name}/${input}`);if(match)assert.equal(c.m[0x8f94],i);checks++;
 }
}
console.log(`OK - 36 raster pointer-handler cases and ${checks} colour-name exact/trailing/case/short inputs`);
