'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536),slot=1;for(const part of ['resident','stage-16'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
function fresh(){const m=base.slice();m[0x909c]=0x60;m[0x792c]=0x60;m[0x4368]=0x60;m[0x43f0]=0x60;m[0x43a2]=0x60;m[0x35c1]=0x60;m[0x4574]=0x60;m[0x45bc]=0x60;return m}
function call(m,a){new CPU(m).call(a,{x:slot},{maxSteps:10000})}
for(const col of [5,10]){const m=fresh();m[0x1991]=3;m[0x1980]=2;m[0x6f3c]=col;m.set([0xa2,10,0xa9,slot,0x60],0x71db);call(m,0x8f13);assert.equal(m[0x1b07],3);assert.equal(m[0x1b18],2);assert.equal(m[0x1ad4],col<10?0:8);assert.equal(m[0x1ab2],1);assert.equal(m[0x1ae5],4)}
{const m=fresh();m[0x1a2a]=2;m[0x1ae5]=5;m[0x6f3c]=10;m[0x49]=98;m[0x4cd1]=50;call(m,0x8f4b);assert.equal(m[0x1ab2],2);assert.equal(m[0x1ae5],2)}
{const m=fresh();m[0x1a2a]=0;m[0x1ab2]=1;call(m,0x8f4b);assert.equal(m[0x1ab2],1)}
{const m=fresh();m[0x1ae5]=0;call(m,0x8f7c);assert.equal(m[0x1ab2],3);assert.equal(m[0x1af6],1);assert.equal(m[0x1ae5],7)}
for(const dir of [0,8]){const m=fresh();m[0x1ae5]=1;m[0x1ad4]=dir;m.set([0xee,0xf0,0x02,0x60],0x43a2);m.set([0xee,0xf1,0x02,0x60],0x43f0);m[0x2f0]=m[0x2f1]=0;call(m,0x8f7c);assert.equal(m[0x2f0],dir?0:1);assert.equal(m[0x2f1],dir?1:0)}
{const m=fresh();m[0x1ae5]=2;m[0x1af6]=4;m[0x1ad4]=0;m[0x1a2a]=2;m[0x4c51]=0;m[0x4c71]=0;m[0x4dae]=2;m[0x1ab2]=3;call(m,0x8faa);assert.equal(m[0x1ae5],1);assert.equal(m[0x1af6],5);assert.equal(m[0x1ab2],4);assert.equal(m[0x1b29],0x52);assert.equal(m[0x1ad4],8)}
for(const [current,reset] of [[1,true],[3,false]]){const m=fresh();m[0x1991]=current;m[0x1980]=0;m[0x1b07]=2;m[0x1b18]=0;m[0x1ab2]=4;call(m,0x9023);assert.equal(m[0x1991],reset?2:current);assert.equal(m[0x1ab2],reset?0:4)}
for(const dir of [0,8]){const m=fresh();m[0x1a90]=1;m[0x19e6]=0x70;m[0x1ad4]=dir;m.set([0x8d,0xf0,0x02,0x60],0x4574);m.set([0x8d,0xf1,0x02,0x60],0x45bc);m[0x2f0]=m[0x2f1]=0;call(m,0x904e);assert.equal(m[0x19f7],15);assert.equal(m[0x19c4],0x76);assert.equal(m[0x2f0],dir?0:8);assert.equal(m[0x2f1],dir?8:0)}
{const m=fresh();m[0x1a90]=0;m[0x1ac3]=7;m[0x8fff]=0x60;call(m,0x904e);assert.equal(m[0x19f7],7);assert.equal(m[0x1ac3],0)}
for(const c of [1,2]){const m=fresh();m[0x1ac3]=c;m[0x19e6]=0x70;m.set([0x8d,0xf0,0x02,0x60],0x4b0e);m.set([0x8d,0xf1,0x02,0x60],0x5db9);m[0x2f0]=m[0x2f1]=0;call(m,0x907e);assert.equal(m[0x1ac3],c-1);assert.equal(m[0x2f0],c===1?2:0);assert.equal(m[0x2f1],c===1?1:0)}
console.log('OK - seven stage 16 entity handlers, controlled branches');
