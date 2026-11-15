'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const {game}=require('../../../kit/scripts/port_check.js'),C64Cpu=require('../../../kit/cpu/cpu6502.js');
const g=game(__dirname),readData=name=>JSON.parse(g.read(name).match(/<script id="t2-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const bytes=s=>Uint8Array.from(Buffer.from(s,'base64')),cache=new Map();
function image(id){if(cache.has(id))return cache.get(id);const dir='parts/'+id,meta=g.json(dir+'/part.json'),m=meta.over?image(meta.over).slice():new Uint8Array(65536);for(const [lo,hi] of meta.coverage.exclude)m.fill(0,parseInt(lo.slice(1),16),parseInt(hi.slice(1),16)+1);for(const r of g.json(dir+'/listing.json').records)if(r.b)m.set(r.b,r.a);cache.set(id,m);return m;}
const I=readData('index.html'),port=g.run('index.html','createDriver','createDriver').createDriver;
// Worklet scope contains only its function text, the passed data, atob and the shared CPU.
const createDriver=vm.runInNewContext('('+port.toString()+')',{atob:s=>Buffer.from(s,'base64').toString('binary')});
let calls=0,writesChecked=0;
for(const choices of [I.tunes,I.sfx])for(let t=0;t<choices.length;t++){
 const q=choices[t],cfg=I.modules[q.module],m=image(cfg.part).slice(),sid=new Uint8Array(25);let writes=[],last=0;
 for(const [a,s] of cfg.chunks)assert.deepStrictEqual(Array.from(bytes(s)),Array.from(m.slice(a,a+bytes(s).length)),cfg.part+' musical excerpt');
 const io={read(a){if(a>=0xd400&&a<0xd800)return last;throw Error('Unexpected original read '+a.toString(16));},write(a,v){assert(a>=0xd400&&a<0xd800);last=v;const r=a&31;if(r<25){sid[r]=v;writes.push(r,v);}}};
 const cpu=new C64Cpu.CPU(m,{port:0x35,io});cpu.call(cfg.init,{a:cfg.kind==='sfx'?0:q.song},{maxSteps:100000});if(cfg.kind==='sfx'){m[0x3ee]=0;m[0xffc0]=q.song?0x80|q.song:0;}
 const drv=createDriver({modules:I.modules,tunes:choices},C64Cpu);drv.init(t);assert.deepStrictEqual(Array.from(drv.writes),writes,q.name+' init');
 const count=cfg.kind==='sfx'?180:1200;
 for(let f=0;f<count;f++){writes=[];cpu.call(cfg.play,{},{maxSteps:100000});drv.play();assert.deepStrictEqual(Array.from(drv.writes),writes,q.name+' call '+f);assert.deepStrictEqual(Array.from(drv.sid),Array.from(sid));writesChecked+=writes.length/2;calls++;}
 drv.stop();for(const r of [4,11,18])assert.equal(drv.sid[r]&1,0);
}
console.log('Sound:',calls,'original driver calls,',writesChecked,'SID writes matched for all',I.tunes.length+I.sfx.length,'buttons');
const M=readData('levels.html');assert.equal(M.maps.length,11);
for(const q of M.maps){const m=image(q.part),w=a=>m[a]+256*m[a+1];assert.equal(q.width,w(0x8fc0));const map=bytes(q.map);assert.equal(map.length,q.width*q.height);assert.deepStrictEqual(Array.from(map),Array.from(m.slice(0x9000,0x9000+map.length)),q.part+' stored map');assert.deepStrictEqual(Array.from(bytes(q.tiles)),Array.from(m.slice(0xb000,0xb000+q.defs*16)));for(let v=0;v<256;v++)assert.equal(((v<<4)&240)|(v>>4),((v&15)*16+Math.floor(v/16)));}
const A=readData('graphics.html');let shapes=0;
for(const q of A.groups){const m=image(q.part);if(q.kind==='sprites'){for(const s of q.sprites){assert.deepStrictEqual(Array.from(bytes(s.data)),Array.from(m.slice(s.address,s.address+63)),q.name+' '+s.address.toString(16));shapes++;}}else if(q.kind==='frames'){const cpu=new C64Cpu.CPU(m.slice());cpu.call(q.part==='level-3-2'?0xa720:0xa7f9,{},{maxSteps:2000000});assert.deepStrictEqual(Array.from(bytes(q.data)),Array.from(cpu.m.slice(q.address,q.address+q.frameBytes*q.count)),q.name);}else if(q.kind==='tallfont'){const expected=[];for(let i=0;i<64;i++)for(let y=0;y<16;y++)expected.push(m[q.address+y*64+i]);assert.deepStrictEqual(Array.from(bytes(q.data)),expected);}else{assert.deepStrictEqual(Array.from(bytes(q.data)),Array.from(m.slice(q.address,q.address+q.count*8)),q.name);}}
for(let i=0;i<16;i++){const m=image('intro').slice();m[14]=i;const cpu=new C64Cpu.CPU(m);let done=false;try{cpu.call(0x8d79,{},{maxSteps:5000000,hooks:{0x8fe2(){done=true;throw Error('DONE');}}});}catch(e){if(!done)throw e;}assert(done);const q=A.pictures[i],b=bytes(q.bitmap);assert.deepStrictEqual(Array.from(b),Array.from(m.slice(0xc000,0xc000+b.length)),'intro picture '+i);}
// Hold the walking preview's divider and shape rule to the original controller prefix.
const walkCode=g.read('graphics.html').match(/function walkStep\(\)\{([\s\S]*?)\}function walkTick/)[1].replace('drawWalk();','return [walkDivider,walkIndex];');
for(let divider=0;divider<256;divider++)for(let index=0;index<7;index++){const m=image('resident').slice();m[0x27]=divider;m[0x28]=index;m[0x2d]=0;const cpu=new C64Cpu.CPU(m);let done=false;try{cpu.call(0x12d5,{},{maxSteps:100,hooks:{0x12ef(){done=true;throw Error('DONE');}}});}catch(e){if(!done)throw e;}const actual=new Function('walkDivider','walkIndex',walkCode)(divider,index);assert.deepStrictEqual(actual,[m[0x27],m[0x28]]);}
console.log('Graphics:',shapes,'sprite pieces,',A.groups.length,'groups, sixteen decoded story pictures and 1792 walking-divider cases matched');
// The level 1-1 boss: fifteen shapes and colours per facing, three columns of five bands, from the pose tables.
{const m=image('level-1-1'),B=A.boss;assert.deepStrictEqual(B.numbers,Array.from(m.slice(0x8634,0x8652)));assert.deepStrictEqual(B.colours,Array.from(m.slice(0x8616,0x8634)));
 for(const n of B.numbers)if(n!==0xfe)assert.deepStrictEqual(Array.from(bytes(B.shapes[n])),Array.from(m.slice(0xc000+n*64,0xc000+n*64+63)),'boss shape '+n);
 for(let i=0;i<4;i++)assert.equal((m[0x8742+i]-m[0x8741+i])&255,21,'boss bands 21 lines apart');
 // The full-pose installer copies fifteen entries per facing into matrices indexed column*5+row.
 assert.deepStrictEqual(Array.from(m.slice(0x8293,0x8295)),[0xa2,0x0e]);console.log('Boss:',Object.keys(B.shapes).length,'shapes and both facings matched');}
// The story text shown with each picture: the intro's rolling-key stream split at its sixteen picture markers.
{const m=image('intro'),out=[];let k277=0xd3,k801=0x13,k1b=0x79;for(let a=0x94c4;a<0xa244;a++){out.push((((m[a]^k277)-k801)&255)^k1b);k1b^=k277;k801=(k801+k1b)&255;k277^=k801;}
 assert.equal(out[0],0x20);const paras=[[]];for(const v of out){if(v===0xff)paras.push([]);else paras[paras.length-1].push(v);}assert.equal(paras.length,17);
 let base=null;A.story.forEach((s,i)=>{assert.equal(s.text,String.fromCharCode(...paras[i]).split(/\s+/).filter(Boolean).join(' '),'story '+(i+1));const inset=A.pictures[i].rows<=12;if(!inset)base=i+1;assert.equal(s.over,inset?base:null);});
 assert.equal(A.story.length,16);console.log('Story: sixteen paragraphs decoded from the intro and matched');}
// Discoveries: the level 1-2 bridge window and its six falling strips, and the farewell rows keyed by the ending's program.
const X=readData('discoveries.html');
{const m=image('level-1-2'),Q=X.bridge,map=bytes(Q.map),w=m[0x8fc0]+256*m[0x8fc1];assert.equal(map.length,Q.width*Q.height);
 for(let r=0;r<Q.height;r++)for(let c=0;c<Q.width;c++)assert.equal(map[r*Q.width+c],m[0x9000+r*w+c],'bridge window '+r+','+c);
 assert.deepStrictEqual(Q.strips.x,Array.from(m.slice(0xaf67,0xaf6d)));assert.deepStrictEqual(Q.strips.w,Array.from(m.slice(0xaf73,0xaf79)));
 // The collapse clears rows four and five of the map: STA $9190,Y and STA $91F4,Y are 4*w and 5*w past $9000.
 assert.equal(0x9190-0x9000,4*w);assert.equal(0x91f4-0x9000,5*w);
 const L=readData('levels.html').maps.find(q=>q.name==='1-2');for(const k of ['tiles','font','colours','defs'])assert.deepStrictEqual(Q[k],L[k]);}
{const m=image('ending'),F=X.farewell;assert.deepStrictEqual(Array.from(bytes(F.fonts[0])),Array.from(m.slice(0x906c,0x906c+880)));assert.deepStrictEqual(Array.from(bytes(F.fonts[1])),Array.from(m.slice(0x93dc,0x93dc+512)));
 const rows=F.rows.map(r=>{const e=bytes(r.enc),k=bytes(r.key);assert.deepStrictEqual(Array.from(e),Array.from(m.slice(r.address,r.address+e.length)));
  e.forEach((_,i)=>assert.equal(k[i],m[0x8206-(r.address+i-0xf600)],'key byte'));return Array.from(e,(v,i)=>(((v^0x86)+k[i]-0xd3)&255));});
 const text=rows.map(b=>String.fromCharCode(...b.slice(3).filter(c=>c<0xfb)));assert.deepStrictEqual(text,['TURRICAN II','will be my','! LAST !','game on the Commodore 64']);
 assert.equal(m[F.patch.address],0x85);assert.equal(F.patch.address,0x8206-(F.rows[F.patch.row].address+F.patch.index-0xf600));
 const p=(((bytes(F.rows[F.patch.row].enc)[F.patch.index]^0x86)+F.patch.value-0xd3)&255),code=p<0x60?p&63:p-0x20;assert.equal(F.patch.glyphAddress,0x93dc+code*8);
 assert.deepStrictEqual(Array.from(bytes(F.patch.glyph)),Array.from(m.slice(F.patch.glyphAddress,F.patch.glyphAddress+8)));console.log('Discoveries: bridge window, strip tables and four keyed farewell rows matched');}
// Render every button through the exact AudioWorklet module, including its private CPU scope.
require('../../../site/lib/sid.js');globalThis.C64Cpu=C64Cpu;
const {CHECKER,verdict}=require('../../../kit/c64/sid_check.js');
for(const choices of [I.tunes,I.sfx])for(let tune=0;tune<choices.length;tune++){
 let Proc,posted=[];const scope={sampleRate:22050,currentTime:0,AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>posted.push(m)};}},registerProcessor(n,c){if(n==='c64-sid-check')Proc=c;}};
 vm.runInNewContext(C64Sid.worklet(createDriver)+CHECKER,scope);const proc=new Proc({processorOptions:{data:{modules:I.modules,tunes:choices},opts:{filter:'6581'},frames:false,tune}}),out=[new Float32Array(128)];let lo=0,hi=0;
 for(let k=0;k<Math.ceil(22050*10/128);k++){scope.currentTime=k*128/22050;proc.process([],[out]);for(const v of out[0]){lo=Math.min(lo,v);hi=Math.max(hi,v);}}
 const result={name:choices[tune].name,error:null,heard:false,vol:false,env:false,moves:hi-lo};for(const m of posted){if(m.driverError)result.error=m.driverError;for(const k of ['heard','vol','env'])if(m[k])result[k]=true;}
 assert.equal(verdict(result,10),null,JSON.stringify(result));
}
console.log('Worklet audio: all',I.tunes.length+I.sfx.length,'buttons rendered ten seconds each and every one sounded');
