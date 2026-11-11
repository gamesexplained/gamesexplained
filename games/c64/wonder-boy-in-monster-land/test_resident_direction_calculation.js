'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
function expected(rx,ry,cx,cy){let dx=(cx-rx)&255,dy=(cy-ry)&255;const quadrant=((cx>=rx?1:0)<<1)|(cy>=ry?1:0),octant=base[0x3577+quadrant];if(dy&128)dy=(-dy)&255;if(dx&128)dx=(-dx)&255;while(dx>=8){dx>>=1;dy>>=1;}while(dy>=8){dx>>=1;dy>>=1;}if(octant&1)[dx,dy]=[dy,dx];return ((octant<<2)+base[0x357b+((dy<<3)|dx)])&15;}
const cases=[[0,0,0,0],[50,50,60,50],[50,50,40,50],[50,50,50,60],[50,50,50,40],[50,50,60,60],[50,50,40,40],[0,255,255,0],[255,0,0,255],[128,0,0,128],[0,0,128,128],[7,9,14,17]];
let seed=0x12345678;for(let i=0;i<1024;i++){const row=[];for(let j=0;j<4;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;row.push(seed>>>24);}cases.push(row);}
for(const [rx,ry,cx,cy] of cases){const a=base.slice();a.set([rx,ry,cx,cy],0x35bd);a.set([0x20,0xea,0x34,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:300});assert.equal(cpu.pc,0x2f3);assert.equal(cpu.a,expected(rx,ry,cx,cy),`${rx},${ry},${cx},${cy}`);}
for(const [rx,ry,xh,xl,sy] of [[21,22,1,100,150],[100,90,0,80,50],[0,0,0,0,0]]){
 const a=base.slice();a[0x1b19]=0;a[0x1b2a]=0;a[0x1ac4]=rx;a[0x1ad5]=ry;a[0x1a2b]=3;a[0x4cd2]=sy;a[0x4c52]=xh;a[0x4c72]=xl;a[0x300]=0;a.set([0x8d,0,3,0x60],0x35c1);a.set([0xa2,2,0x20,0xb9,0x3d,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f5,maxSteps:400});assert.equal(cpu.pc,0x2f5);const direction=expected(rx,ry,((xh&1)<<7)|(xl>>1),sy>>1)|0xc0;assert.equal(a[0x1b2a],direction);assert.equal(a[0x300],direction);
}
console.log('OK - resident coordinate direction calculation');
