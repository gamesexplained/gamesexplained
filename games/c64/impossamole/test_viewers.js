'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
require('../../../site/lib/sid.js');
const CPUlib=require('../../../kit/cpu/cpu6502.js'),{CPU}=CPUlib;
const root=__dirname,html=['index.html','levels.html','graphics.html'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
function block(name){return html.split('// '+name+'\n')[1].split('// end '+name)[0];}
const map=vm.runInNewContext(block('im-map-port')+';({imBlock})',{});
const anim=vm.runInNewContext(block('im-animation-port')+';({imActor,imTick,imTemplates})',{});
const driverSource=block('im-audio-driver').trim().replace(/^function createDriver/, 'function createDriver');
const create=vm.runInNewContext('('+driverSource+')',{});
// Lists store bytes as hexadecimal strings; accept the canonical representation.
function read(folder){const m=new Uint8Array(65536),has=new Uint8Array(65536),L=JSON.parse(fs.readFileSync(path.join(root,folder,'listing.json')));for(const r of L.records){const b=typeof r.b==='string'?Buffer.from(r.b.replace(/\s/g,''),'hex'):r.b||[];m.set(b,r.a);has.fill(1,r.a,r.a+b.length);}return{m,has};}
const base=read('parts/resident').m;let templateCount=0;
for(const id of ['klondike','orient','amazon','iceland','bermuda']){
 const {m:part,has}=read('parts/'+id),m=base.slice();for(let a=0;a<65536;a++)if(has[a])m[a]=part[a];
 for(let id=0;id<256;id++){const b=m.slice();b[0x10]=0;b[0x11]=0x10;b[0x40]=0;b[0x41]=0x20;new CPU(b,{port:0x35}).call(0x5192,{a:id,x:15});const offsets=[0,1,2,3,40,41,42,43,80,81,82,83,120,121,122,123];assert.deepStrictEqual(Array.from(map.imBlock(m,id)),offsets.map(o=>b[0x1000+o]));for(let i=0;i<16;i++)assert.equal(b[0x2000+offsets[i]],m[0xae00+map.imBlock(m,id)[i]]);}
 for(const t of anim.imTemplates(m)){templateCount++;const a=anim.imActor(m,t.p),b=m.slice(),cpu=new CPU(b,{port:0x35});b.fill(0,0x86b8,0x86c0);b[0xa8]=t.p&255;b[0xa9]=t.p>>8;cpu.call(0x3c32,{x:2});for(const [key,ad]of [['shape',0x86e2],['colour',0x86ea],['expandX',0x8712],['expandY',0x871a],['multi',0x8722],['index',0x873a],['delay',0x8742]])assert.equal(a[key],b[ad],key);
 for(let f=0;f<100;f++){anim.imTick(m,a);cpu.call(0x382b);for(const [key,ad]of [['shape',0x86e2],['index',0x873a],['delay',0x8742],['active',0x86ba]])assert.equal(a[key],b[ad],id+' '+t.id+' '+f+' '+key+' state '+JSON.stringify(a)+' cpu '+[b[0x86e2],b[0x873a],b[0x8742],b[0x86ba]]+' ptr '+t.p);}}
}
const ranges=[[0x60da,0x7ebf],[0x9c00,0x9fff]],mem=ranges.map(([a,b])=>[a,Array.from(base.slice(a,b+1))]);
{const m=base.slice(),cpu=new CPU(m,{port:0x35,io:{write(){}}});cpu.call(0x6d10);assert.equal(m[0x66ff],255);assert.equal(m[0x6700],255);assert.equal(m[0x6d9d],255);}
let frames=0;
for(let t=0;t<=16;t++){
 const fn=t?vm.runInNewContext('('+driverSource.replace('tune=t;m=','t=t+1;tune=t;m=')+')',{}):create,d=fn({mem},CPUlib);let writes=[];const b=base.slice(),cpu=new CPU(b,{port:0x35,io:{read:a=>{throw Error('read '+a)},write(a,v){if(a>=0xd400&&a<=0xd418)writes.push(a-0xd400,v);else throw Error('write '+a);}}});
 d.init(t? t-1:0);if(!t){b[0x66ff]=0;cpu.call(0x6cc5,{a:0});}else{b.fill(0,0x6583,0x65f1);b[0x6102]=0;cpu.call(0x6107);b[0x6105]=1;b[0x6106]=t-1;}assert.deepStrictEqual(Array.from(d.writes),writes,'initial writes '+t);
 let gates=0,volume=0;for(let f=0;f<(t?500:6000);f++){writes=[];if(t){cpu.call(0x6117);cpu.call(0x6281);}else cpu.call(0x6701);d.play();assert.deepStrictEqual(Array.from(d.writes),writes,'audio '+t+' frame '+f);for(let i=0;i<writes.length;i+=2){if(writes[i]===24)volume=writes[i+1]&15;if([4,11,18].includes(writes[i])&&(writes[i+1]&1)&&volume)gates++;}frames++;if(t&&!d.playing())break;}assert(gates>0,'audible gates '+t);
}
for(let t=0;t<=16;t++){const d=create({mem},CPUlib),p=C64Sid.engine().createPlayer(d,22050,{filter:'6581'});p.command({cmd:'start',tune:t});const out=new Float32Array(22050);p.render(out,out.length,0);let lo=Infinity,hi=-Infinity;for(const x of out){lo=Math.min(lo,x);hi=Math.max(hi,x);}assert(hi-lo>0.01,'audible output '+t);}
console.log('PASS: 1280 block expansions, '+templateCount+' actor templates × 100 animation calls, and '+frames+' audio frames match CPU writes.');
// Discoveries: the shop's payment, the cheat-name check and the out-of-key tune, each against the game's own code
{
 const disc=fs.readFileSync(path.join(root,'discoveries.html'),'utf8'),dblock=name=>disc.split('// '+name+'\n')[1].split('// end '+name)[0];
 const hag=vm.runInNewContext(dblock('im-haggle-port')+';({imPayStart,imPaying,imPayFrame})',{});
 const names=vm.runInNewContext(dblock('im-name-port')+';({imCheckName})',{});
 const shift=vm.runInNewContext('('+dblock('im-shift-driver').trim()+')',{});
 const kl=base.slice();{const {m:part,has}=read('parts/klondike');for(let a=0;a<65536;a++)if(has[a])kl[a]=part[a];}
 let seed=15112026;const rnd=()=>(seed=(seed*1103515245+12345)>>>0)>>>16;
 let purchases=0;
 for(const type of [1,2,3,4,5,7]){const price=kl[0x8091+type];assert(price>0,'price '+type);
  const p=kl[0x817c+2*type]|kl[0x817d+2*type]<<8;assert.equal(kl[p+10],type,'template '+type+' is item type '+type);
  for(const style of ['still','every frame','every 4 frames','random']){
   for(const startLatch of [0,4,8]){
    const b=kl.slice();let joyNow=0x7f;const cpu=new CPU(b,{port:0x35,io:{read(a){if(a===0xdc00)return joyNow;if(a>=0xd000&&a<0xd800)return 0;throw Error('read '+a.toString(16));},write(){}}});
    b[0x80d9]=0;b[0x7f78]=250;b[0x809c]=startLatch;b[0x8090]=price+1;cpu.call(0x1458);
    const s=hag.imPayStart(price,startLatch);let f=0;
    while(b[0x8090]>=3){joyNow=style==='still'?0x7f:style==='every frame'?(f%2?0x7b:0x77):style==='every 4 frames'?((f>>2)%2?0x7b:0x77):rnd()&255;
     assert(hag.imPaying(s));hag.imPayFrame(s,joyNow);cpu.call(0x1446);f++;
     assert.deepStrictEqual([s.state,s.money,s.latch],[b[0x8090],b[0x7f78],b[0x809c]],'pay '+type+' '+style+' frame '+f);}
    assert(!hag.imPaying(s));assert.equal(f,price);if(style==='still')assert.equal(250-s.money,price);if(style==='every frame')assert(250-s.money<=1);purchases++;}}}
 const tried=['OOCHOUCH','LUMBAJAK',' HEINZ. ','COMMANDO','ANNFRANK','JUGGLERS','JIM.....','JUDY....','JUGGLER.','JUGGLERZ','........','  ROB   ','HEINZ...','LUMBAJA.'];
 for(let k=0;k<200;k++)tried.push(Array.from({length:8},()=>'.ABCDEFGHIJKLMNOPQRSTUVWXYZ ?'[rnd()%29]).join(''));
 for(const name of tried){const b=base.slice(),cpu=new CPU(b,{port:0x35});for(let i=0;i<8;i++)b[0x5c64+i]=name.charCodeAt(i);b[0x08e7]=0;b[0x08be]=0xee;cpu.call(0x5001);
  const r=names.imCheckName(base,name);assert.equal(r.count,b[0x7126],'count '+name);assert.equal(r.id<0?0xee:r.id,b[0x08be],'cheat '+name);}
 assert.equal(names.imCheckName(base,'OOCHOUCH').id,4);assert.equal(names.imCheckName(base,'JUDY....').count,2);
 // the shifted tune: the driver's writes and registers match the CPU with the cheat's 8 in $7126, and voice 3 is eight semitones up
 const tuneMem=[[0x60da,Array.from(base.slice(0x60da,0x7ec0))]];
 const voice3=[];
 for(const t of [0,1]){const d=shift({mem:tuneMem},CPUlib);d.init(t);const b=base.slice();b[0x7126]=t?8:0;const sid=new Uint8Array(25);let writes=[];
  const cpu=new CPU(b,{port:0x35,io:{read(a){throw Error('read '+a)},write(a,v){sid[a-0xd400]=v;writes.push(a-0xd400,v);}}});b[0x66ff]=0;cpu.call(0x6cc5,{a:0});for(let f=0;f<2506;f++)cpu.call(0x6701);
  assert.deepStrictEqual(Array.from(d.sid),Array.from(sid),'registers after the run-in '+t);const v=[];
  for(let f=0;f<2000;f++){writes=[];cpu.call(0x6701);d.play();assert.deepStrictEqual(Array.from(d.writes),writes,'shifted tune '+t+' frame '+f);assert.deepStrictEqual(Array.from(d.sid),Array.from(sid));v.push(sid[14]|sid[15]<<8);}voice3.push(v);
  // Stop: the game's stop at $6D10, heard on the next frame, after which the driver plays nothing and says it has stopped
  assert(d.playing(),'playing before Stop '+t);writes=[];cpu.call(0x6d10);const stopped=writes;d.stop();assert(!d.playing(),'stopped '+t);
  for(let f=0;f<50;f++){writes=[];cpu.call(0x6701);d.play();assert.deepStrictEqual(Array.from(d.writes),f?writes:stopped.concat(writes),'after Stop '+t+' frame '+f);assert(!d.playing()&&!d.writes.slice(f?0:stopped.length).length,'silent after Stop '+t);}
  assert.deepStrictEqual(Array.from(d.sid),Array.from(sid),'registers after Stop '+t);assert(!(sid[24]&15)&&![4,11,18].some(r=>sid[r]&1),'volume 0 and gates off after Stop '+t);}
 const f=voice3[0].findIndex((x,i)=>x!==voice3[1][i]);assert(f>0&&f<400,'voice 3 changes within eight seconds: '+f);assert(Math.abs(voice3[1][f+2]/voice3[0][f+2]-Math.pow(2,8/12))<0.01,'eight semitones');
 console.log('PASS: '+purchases+' shop payments, '+tried.length+' high-score names and the shifted tune, and its Stop, match the game’s code.');
}
