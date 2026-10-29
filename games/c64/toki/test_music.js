'use strict';
// The music page runs the game's own sound driver on the kit's 6502. This checks that the bytes the page
// carries match the Source tab wherever it holds them, and that the page's driver makes the same writes to
// the sound chip, in order, on every frame, as the driver called directly on the same bytes.
const path=require('path'),fs=require('fs'),assert=require('assert');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const g=game(__dirname);g.lib('cpu6502');const C=globalThis.C64Cpu;
const {createDriver}=g.run('music.html','createDriver','createDriver');
const html=fs.readFileSync(path.join(__dirname,'music.html'),'utf8');
const image=Uint8Array.from(Buffer.from(/const IMAGE = '([^']+)'/.exec(html)[1],'base64'));
assert.equal(image.length,0x7cbd-0x6501);
const L=g.listing('listing.json');
// the driver's variables $6503-$65C7 and the operands it patches as it runs differ in play from the cartridge's copy
const patched=new Set([0x6937,0x6938,0x6994,0x6995,0x6a51,0x6a52,0x6e89,0x6e8a,0x6e97,0x6e98]);
let same=0;
for(let a=0x6501;a<=0x7cbc;a++){
 if(!L.has[a]||(a>=0x6503&&a<=0x65c7)||patched.has(a))continue;
 assert.equal(image[a-0x6501],L.ram[a],`byte ${a.toString(16)} differs from the listing`);same++;
}
const data={base:0x6501,bytes:image};
let calls=0,writes=0;const lengths=[];
for(let t=0;t<13;t++){
 const p=createDriver(data,C);p.init(t);
 let events=[],bus=0;
 const m=new Uint8Array(65536);m.set(image,0x6501);
 const c=new C.CPU(m,{port:0x35,io:{read(a){return m[a];},write(a,v){if(a>=0xd400&&a<=0xd418)events.push(a-0xd400,v);else m[a]=v;}}});
 if(t<3)c.call(0x66a9,{x:6*t});else{c.call(0x660d,{});c.call(0x6633,{x:4*(t-3)});}
 assert.deepStrictEqual(Array.from(p.writes),events,`tune ${t} init`);
 let frames=0,gates=0;
 for(;frames<20000;frames++){
  events=[];c.call(0x6787,{},{maxSteps:200000});p.play();
  assert.deepStrictEqual(Array.from(p.writes),events,`tune ${t} frame ${frames}`);
  calls++;writes+=events.length/2;
  for(let k=0;k<events.length;k+=2)if((events[k]===4||events[k]===11||events[k]===18)&&events[k+1]&1)gates++;
  if(!p.playing()){frames++;break;}
 }
 assert(gates>0,`tune ${t} never opens a voice`);
 lengths.push(frames);
}
console.log('frames per tune or effect:',lengths.join(' '));
assert.deepStrictEqual(lengths,[20000,20000,20000,21,10,18,18,27,14,9,15,17,27]);

// each tune and effect, rendered through the kit's model of the chip, is audible
require(path.resolve(__dirname,'../../../site/lib/sid.js'));
const E=globalThis.C64Sid.engine();
for(let t=0;t<13;t++){
 const p=E.createPlayer(createDriver(data,C),44100,{filter:'6581'});
 p.command({cmd:'start',tune:t,run:1,at:0});
 const out=new Float32Array(44100/2);p.render(out,out.length,0,null);
 let peak=0;for(const v of out)peak=Math.max(peak,Math.abs(v));
 assert(peak>0.01,`tune ${t} renders silent (peak ${peak})`);
}
console.log(`PASS: ${lengths.length} tunes and effects, ${same} bytes agree with the listing, ${calls} calls, ${writes} ordered SID writes`);
