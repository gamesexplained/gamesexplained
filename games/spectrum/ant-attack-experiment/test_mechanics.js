'use strict';
// Compares the page's actual functions with the original Z80 instructions from listing.json.
// No private snapshot or emulator is needed. Grenades use an empty desert test cell, the same
// height and facing as the page, with humans behind the projectile. Ant scheduling covers every
// count/period byte. Mask drawing covers every stored shape on three backgrounds.
const assert=require('assert'),path=require('path'),crypto=require('crypto');
const {game}=require('../../../kit/scripts/port_check.js');const {CPU}=require('../../../kit/spectrum/z80.js');
const g=game(__dirname),{fuseStep,antTick,shapePixel}=g.run('index.html','aa-mechanics','fuseStep','antTick','shapePixel');g.sameBlock('aa-mechanics');
const L=g.listing();function call(m,pc,regs={},hook){const c=new CPU(m);Object.assign(c,regs);c.pc=pc;c.sp=0x7f00;m[0x7f00]=0;m[0x7f01]=0x5b;let n=0;while(c.pc!==0x5b00&&n++<100000){if(hook&&hook(c))continue;c.step();}assert.equal(c.pc,0x5b00,'routine returned');return c;}
let grenadeCases=0;for(let mask=0;mask<=30;mask+=2){const m=L.ram.slice();m[0xb430]=20;m.set([40,40,0,220,1,0,0,1],0xb480);m.fill(0,0xb4a0,0xb4b0);m[0xb4a7]=16;let state={x:0,fuse:0,ammo:20,recovery:0,active:false,exploding:false};for(let t=0;t<=mask+1;t++){const input=t===0?mask:0;const c=new CPU(m,{io:{in:()=>255^input}});c.pc=0x8d00;c.sp=0x7f00;c.ix=0xb4a0;c.iy=0xb480;m[0x7f00]=0;m[0x7f01]=0x5b;for(let n=0;c.pc!==0x5b00&&n<10000;n++)c.step();assert.equal(c.pc,0x5b00);call(m,0x89d0,{ix:0xb4a0,iy:0xb480});state=fuseStep(state,input);assert.equal(m[0xb42e],state.fuse,'fuse mask '+mask+' t'+t);assert.equal(m[0xb430],state.ammo);if(mask)assert.equal(m[0xb4a0]-40,state.x,'travel mask '+mask+' t'+t);grenadeCases++;if(state.exploding||!mask)break;}}
let antCases=0;for(let period=0;period<256;period++)for(let count=0;count<256;count++){const m=L.ram.slice();m[0xb4b6]=0;m[0xb4b9]=0;m[0xb4bd]=period;m[0xb4be]=count;let move=false;call(m,0x8a5d,{ix:0xb4b0},c=>{if(c.pc!==0x8a00)return false;move=true;c.pc=m[c.sp]|m[c.sp+1]<<8;c.sp+=2;return true;});const s=antTick(count,period);assert.equal(m[0xb4be],s.count);assert.equal(move,s.move);antCases++;}
for(let count=0;count<256;count++){const m=L.ram.slice();m[0xb4b6]=255;m[0xb4be]=count;call(m,0x8a5d,{ix:0xb4b0});assert.deepEqual(antTick(count,3,true),{count,move:false});assert.equal(m[0xb4be],count);antCases++;}
let shapes=0;for(const id of [...Array.from({length:24},(_,i)=>0x68+i),...Array.from({length:36},(_,i)=>0xdc+i)])for(const bg of [0,0x55,255]){const m=L.ram.slice();m.fill(bg,0xa000,0xb180);m[0xb450]=id;const position=0xb506;
const a0=call(m,0x8130,{h:position>>8,l:position&255});const addr=(a0.h<<8)|a0.l;
call(m,0x80a0,{h:position>>8,l:position&255,d:0,e:31,ix:0xb450});for(let y=0;y<16;y++)for(let x=0;x<16;x++){const dest=addr+y*32+(x>>3),actual=!!(m[dest]&(128>>(x&7))),old=!!(bg&(128>>(x&7)));assert.equal(+actual,shapePixel(L.ram,0x8000+id*64,x,y,old));}shapes++;}
console.log('PASS: '+grenadeCases+' grenade updates, '+antCases+' scheduling cases, '+shapes+' shape/background cases');
