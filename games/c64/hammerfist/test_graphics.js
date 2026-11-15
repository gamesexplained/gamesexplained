'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const {game}=require('../../../kit/scripts/port_check.js'),g=game(__dirname);g.lib('cpu6502');const CPU=C64Cpu.CPU;
const {hammerGraphics}=g.run('graphics.html','hammerGraphics'),P=hammerGraphics();
function embedded(page,id){const src=g.read(page),match=src.match(new RegExp('<script type="application/json" id="'+id+'">([\\s\\S]*?)</script>'));assert(match,id);return JSON.parse(match[1]);}
const data=embedded('graphics.html','hf-graphics-data');
function memory(id){const ram=new Uint8Array(65536);for(const part of ['resident',...(id==='resident'?[]:['complex-7']),...(!['resident','complex-7'].includes(id)?[id]:[])]){const L=g.listing('parts/'+part+'/listing.json');for(let a=0;a<65536;a++)if(L.has[a])ram[a]=L.ram[a];}return ram;}
let bitmaps=0,components=0,players=0,animationTicks=0,effectTicks=0;
for(const d of data){
 const original=memory(d.part);
 for(const a of d.playerAnimations)for(let i=0;i<a.poses.length;i++){assert.equal(a.poses[i],original[a.poseBase+i*a.stride]);assert.equal(a.delays[i],original[a.delayBase+i*a.stride]);}
 for(const a of d.effectAnimations){
  const m=new Uint8Array(original),cpu=new CPU(m,{port:0x35});m[0x80]=a.phase;m[0x13b6]=0;m[0x7d]=128;m[0x7e]=1;m[0x7f]=100;
  const total=a.frames.reduce((n,f)=>n+Math.max(1,f.delay),0);
  for(let tick=0;tick<total;tick++){m[0x350]=0;m[0x3a]=tick;cpu.call(d.effectUpdater,{}, {maxSteps:200000});const f=a.frames[P.frameAt(a.frames,tick)];assert.equal(m[0x320],f.sourceImage);assert.equal(m[0x318]&15,f.colour);assert.equal(!!m[0x338],f.multi);effectTicks++;}
 }

 for(const b of d.bitmaps)for(const flip of [0,1]){
  const m=new Uint8Array(original),cpu=new CPU(m,{port:0x35});m[0x1e]=(d.directory+b.index*2)&255;m[0x1f]=(d.directory+b.index*2)>>8;m[0x7b]=0;m[0x7c]=flip;
  cpu.call(d.unpacker,{a:0},{maxSteps:100000});const wanted=flip?P.reflected(b.pixels,b.multicolour):b.pixels;
  assert.deepStrictEqual(Array.from(m.slice(0x2800,0x283f)),Array.from(wanted),d.part+' bitmap '+b.index+' flip '+flip);bitmaps++;
 }
 for(const shape of d.actorShapes)for(const facing of [0,1]){
  const m=new Uint8Array(original),cpu=new CPU(m,{port:0x35});m[0x26]=shape.address&255;m[0x27]=shape.address>>8;m[0xaa]=128;m[0xab]=1;m[0xac]=100;m[0x7c]=facing;m[0x3c]=0;
  cpu.call(d.stager,{a:0,x:1},{maxSteps:200000});const pieces=P.actorPieces(shape,facing,d.actorImageOffset).slice(0,4);
  assert.equal(m[0x34],pieces.length+1);
  for(let i=0;i<pieces.length;i++){const p=pieces[i],slot=i+1;assert.equal(m[0x320+slot],p.image-d.actorImageOffset);assert.equal(m[0x300+slot]+m[0x308+slot]*256,128+p.x,d.part+' shape '+shape.address.toString(16));assert.equal(m[0x310+slot],(100+p.y)&255);assert.equal(m[0x318+slot]&15,p.colour);assert.equal(!!m[0x338+slot],p.multi);assert.equal(!!m[0x340+slot],p.lower!=null);if(p.lower!=null)assert.equal(m[0x328+slot],p.lower-d.actorImageOffset);
   if(p.lower!=null){const top=d.bitmaps[p.image],bottom=d.bitmaps[p.lower],up=facing?P.reflected(top.pixels,top.multicolour):top.pixels,down=facing?P.reflected(bottom.pixels,bottom.multicolour):bottom.pixels,cache=0x2800+(m[0x16ed+slot]-m[0x3a0+slot])*64;assert.deepStrictEqual(Array.from(m.slice(cache+64,cache+127)),Array.from(down.slice(0,42)).concat(Array.from(up.slice(42))));}}components++;
 }
 for(const shape of d.shapes)for(const facing of [0,1]){
  const m=new Uint8Array(original),cpu=new CPU(m,{port:0x35});m[0x355]=m[0x356]=0;m[0x4f]=facing?0:1;m[0x5c]=128;m[0x5e]=1;m[0x5d]=100;m[0xa0]=m[0x52]=m[0x9e]=0;
  cpu.call(d.playerRenderer,{a:shape.index},{maxSteps:300000});const pieces=P.playerPieces(shape,facing);
  for(let i=0;i<pieces.length;i++){const slot=5+i,p=pieces[i];assert.equal(m[0x320+slot],p.image);assert.equal(m[0x300+slot]+m[0x308+slot]*256,128+p.x,d.part+' player '+shape.index);assert.equal(m[0x310+slot],(100+p.y)&255);assert.equal(m[0x318+slot]&15,p.colour);if(i<2){assert.equal(!!m[0x345+i],p.lower!=null);if(p.lower!=null){assert.equal(m[0x32d+i],p.lower);const top=d.bitmaps[p.image],bottom=d.bitmaps[p.lower],up=facing?P.reflected(top.pixels,top.multicolour):top.pixels,down=facing?P.reflected(bottom.pixels,bottom.multicolour):bottom.pixels,cache=0x2800+(m[0x16f2+i]-m[0x3a5+i])*64;assert.deepStrictEqual(Array.from(m.slice(cache+64,cache+127)),Array.from(down.slice(0,42)).concat(Array.from(up.slice(42))));}}}players++;
 }
 for(const a of d.animations){
  const m=new Uint8Array(original),cpu=new CPU(m,{port:0x35});m[0x1322]=a.address&255;m[0x1326]=a.address>>8;m[0x132a]=0;m[0x131e]=0;
  const total=a.frames.reduce((n,f)=>n+Math.max(1,f.delay),0);
  for(let tick=0;tick<total*2;tick++){m[0x3a]=tick&255;cpu.call(d.animator,{x:0});const wanted=P.frameAt(a.frames,tick);assert.equal(m[0x132a]/3,wanted,d.part+' animation '+a.address.toString(16)+' tick '+tick);animationTicks++;}
 }
}
console.log(bitmaps+' bitmap cases, '+components+' component assemblies, '+players+' player assemblies, '+animationTicks+' actor-animation ticks and '+effectTicks+' effect-animation ticks match original code');
module.exports={embedded,memory};
