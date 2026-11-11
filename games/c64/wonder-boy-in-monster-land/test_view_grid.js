'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const {CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
let seed=0x12345678;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24;}
for(let i=0;i<5000;i++){
 const m=base.slice(), x=(rand()<<8)|rand(), y=rand(), fineX=rand()&7, fineY=rand()&7, left=rand(), top=rand();
 m[0x47]=x&255;m[0x48]=x>>8;m[0x49]=y;m[0x4d6a]=fineX;m[0x4d69]=fineY;m[0x569b]=left;m[0x569d]=top;
 let scratch=(x-fineX-0x15)&65535, offsetX=(scratch+(left&1?8:0))&15;
 scratch=(scratch+12)&65535;const shifted=(scratch>>3)&63, carry=(scratch>>2)&1;
 const column=((((shifted+left+carry)&255)>>1)-1)&255;
 const vertical=(y-0x43-fineY-(y<0x43?1:0))&255, row=(((vertical>>3)+top)&255)>>1;
 const offsetY=vertical&(top&1?7:15);
 new CPU(m).call(0x6ea9);
 assert.deepEqual([m[0x6f3c],m[0x6f3d],m[0x527c],m[0x527d]],[column,row,offsetX,offsetY],`case ${i}`);
}
console.log('OK - 5,000 view-grid cases, including arithmetic wrap and shift carry');
