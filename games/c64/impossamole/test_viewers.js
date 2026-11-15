'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
require('../../../site/lib/sid.js');
const CPUlib=require('../../../kit/cpu/cpu6502.js'),{CPU}=CPUlib;
const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8');
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
