'use strict';
const path=require('path'),assert=require('assert'),crypto=require('crypto'),{game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const g=game(__dirname);g.lib('cpu6502');const {CPU}=globalThis.C64Cpu;
g.sameBlock('trRules');const {trReflect,trLife}=g.run('index.html','trRules','trReflect','trLife'),L=g.listing('parts/resident/listing.json');
const bcd=n=>Math.floor(n/10)*16+n%10,decimal=v=>(v>>4)*10+(v&15);
let scoreCases=0;const scoreCpu=new CPU(L.ram.slice(),{port:0x35});
for(let score=0;score<10000;score++)for(let threshold=5;threshold<=95;threshold+=10)for(const lives of [1,5,9]){
 const c=scoreCpu;c.m[0x201]=bcd(score%100);c.m[0x202]=bcd(Math.floor(score/100));c.m[0x20a]=bcd(threshold);c.m[0x20b]=0;c.m[0x20c]=lives;c.call(0xfc00);
 const r=trLife(score*100,threshold*10000,lives);assert.equal(r.lives,c.m[0x20c]);assert.equal(r.threshold,decimal(c.m[0x20a])*10000);scoreCases++;
}
let sprites=0;
for(let n=0;n<99;n++)for(const multi of [false,true]){
 const c=new CPU(L.ram.slice(),{port:0x35});c.call(0xa8c8);const ptr=0x40+n,source=L.ram.slice(0x5000+n*64,0x5000+n*64+63),out=trReflect(source,multi);
 c.m[0x6a]=ptr;c.m[0x6d]=ptr;c.m[0x619]=1;c.m[0x621]=255;c.m[0x623]=255;const dest=multi?0x7ec0:0x7e00;c.m[dest+63]=0xa5;c.call(multi?0xfdc0:0xfd42);
 assert.deepStrictEqual(Array.from(out),Array.from(c.m.slice(dest,dest+63)));assert.equal(c.m[dest+63],0xa5);sprites++;
}
for(let value=0;value<256;value++)for(const multi of [false,true]){const a=new Uint8Array(63).fill(value),b=trReflect(a,multi),c=new CPU(L.ram.slice(),{port:0x35});c.call(0xa8c8);c.m.set(a,0x5000);c.m[0x6a]=0x40;c.m[0x6d]=0x40;c.m[0x619]=1;c.m[0x621]=255;c.m[0x623]=255;c.call(multi?0xfdc0:0xfd42);const dest=multi?0x7ec0:0x7e00;assert.deepStrictEqual(Array.from(b),Array.from(c.m.slice(dest,dest+63)));assert.deepStrictEqual(Array.from(trReflect(b,multi)),Array.from(a));}
g.lib('c64');const {TR_FRAME}=g.run('index.html','trFrame','TR_FRAME'),frame=globalThis.C64.renderFrame(TR_FRAME);assert.equal(frame.px.length,104448);assert.equal(frame.romReads,0);const hash=crypto.createHash('sha256').update(frame.px).digest('hex');
assert.equal(hash,'b70d6f5361c41a3c062b47f434ebd3a6de32e7dc364b90f1fd16cf8050f7c111');
console.log(`PASS: ${scoreCases} score cases, ${sprites} native sprite mirrors, 256-byte involutions, frame ${hash}`);
