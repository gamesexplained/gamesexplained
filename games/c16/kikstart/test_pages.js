'use strict';
// Rebuild the page's mechanics and pictures from its actual script blocks,
// and compare them with the original routines in the committed listing.
const path=require('path'),assert=require('assert'),crypto=require('crypto');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const g=game(__dirname);g.lib('c16','cpu6502','ted-sound');const {CPU}=C64Cpu;
const {KS}=g.run('index.html','kikstart-core','KS');g.sameBlock('kikstart-core');
const ram=g.listing().ram;
function fresh(){const m=ram.slice();m.fill(0,2,0x1000);return new CPU(m,{ramSize:0x4000});}
for(const air of [false,true])for(let value=0;value<256;value++)for(const bits of [0,4,8,12]){
 const c=fresh();c.m[2]=2;c.m[0x2a]=value;c.m[0x33]=0x80|bits;c.m[0x27]=c.m[0x37]=c.m[0x39]=75;
 c.call(air?0x2e44:0x2784,{d:false});
 assert.equal(KS.speed(value,bits,air),c.m[0x2a],`speed ${air}/${value}/${bits}`);
}
for(let i=0;i<16;i++){
 const c=KS.course(ram,i);assert.equal(c.start,ram[0x1e50+i]+256*ram[0x1e60+i]);
 assert(c.end>c.start&&c.columns.length===c.end-c.start);assert.equal(c.columns[14],253);assert.equal(c.columns[30],254);
 for(let bikes=1;bikes<=5;bikes++)for(const time of [0,1,9,10,205,999]){
  const cpu=fresh(),m=cpu.m;m[0x30]=bikes;m[0x2f]=i;m[0xc07]=11+Math.floor(time/100);m[0xc08]=11+Math.floor(time/10)%10;m[0xc0a]=11+time%10;
  cpu.call(0x269c,{d:false});
  const units=Array.from(m.slice(0xd5d,0xd60)).reduce((a,v)=>10*a+v-0x52,0);
  const bonus=KS.bonus(ram,i,bikes,time);assert.equal(bonus.bikeUnits,units);assert.equal(bonus.nextBikes,m[0x30]);
  assert.equal(bonus.points,(time+units)*ram[0x1e10+i]);
 }
}
for(let v=0;v<256;v++){
 const c=fresh(),m=c.m;m[0x24]=0;m[0x25]=0x30;m.fill(v,0x3000,0x3028);m.fill(0x3d,0x800,0xc00);m.fill(1,0xf48,0xf70);
 c.call(0x239c,{d:false});const reference=C16.render(m,KS.registers(),{size:0x4000}),actual=KS.terrain(ram,Uint8Array.of(v));
 for(let y=0;y<48;y++)for(let x=0;x<8;x++)assert.equal(actual.px[y*8+x],reference.px[(y+128)*320+x],`terrain ${v}/${x}/${y}`);
}
for(let align=0;align<4;align++)for(let fine=0;fine<4;fine++)assert.equal(KS.shape(ram,'bike',0,fine,align).cells.length,9);
for(let type=0;type<8;type++)for(let fine=0;fine<4;fine++)assert.equal(KS.shape(ram,'object',type,fine).cells.length,6);
for(let type=8;type<16;type++){
 assert.equal(KS.shape(ram,'cloud',type,128).cells.length,4);
 assert.equal(KS.shape(ram,'cloud',type,129).cells.length,16-(type&3));
 assert.equal(KS.shape(ram,'cloud',type,130).cells.length,4);
}
assert.equal(KS.shape(ram,'particles',0,0).cells.length,8);assert.equal(KS.shape(ram,'particles',0,24).cells.length,0);
const {makeFrame}=g.run('index.html','kikstart-frame','makeFrame');
const frameHash=crypto.createHash('sha256').update(C16.rgba(makeFrame(ram))).digest('hex');
assert.equal(frameHash,'e1e30b0b2ea43c1851a0aed20675f7ad352e252b6c9c13f3cf2e82d1c57def4f','64,000 pixels match the held emulator frame');
const {KS_TUNE}=g.run('index.html','kikstart-music','KS_TUNE'),log=TEDSound.unpack(KS_TUNE);
const music=fresh(),writes=[];music.m[0x34]=5;music.m[0x35]=255;
const io={read:a=>music.m[a],write:(a,v)=>{music.m[a]=v;if(a>=0xff0e&&a<=0xff12)writes.push([a,v]);}};
const driver=new CPU(music.m,{ramSize:0x4000,ioPages:[255],io});
for(let i=0;i<1152;i++)driver.call(0x2aa0,{d:false});
assert.deepStrictEqual(writes,Array.from(log.writes,w=>[w[1],w[2]]),'recorded music values regenerate from the listing');
assert.equal(log.end,1152*35568);assert.equal(log.writes.length,5760);
for(let i=1;i<log.writes.length;i++)assert(log.writes[i][0]>=log.writes[i-1][0]);
for(const entry of [0x2b5c,0x2b74,0x2b8c,0x2c20,0x2c38,0x2ba0]){
 const effect=KS.effect(ram,entry);assert(effect.writes.length>0);assert(TEDSound.render(effect,11025).some(v=>Math.abs(v)>.001));
}
console.log('PASS Kikstart pages: all speed bytes, 16 course tables, bonuses, 256 terrain bytes, shape variants, 64,000 pixels, complete tune, and effects');
