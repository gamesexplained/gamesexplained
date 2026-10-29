'use strict';
const path=require('path'),assert=require('assert');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const g=game(__dirname);g.lib('cpu6502');const C=globalThis.C64Cpu;
const {createDriver}=g.run('music.html','trMusic','createDriver');
const L=g.listing('parts/resident/listing.json'),bytes=L.ram.slice(0x700,0x2023);
for(let a=0x700;a<0x2023;a++)if(a<0x14c9||a>0x1522)assert(L.has[a],`missing music byte ${a.toString(16)}`);
let calls=0,writes=0;
const lengths=[];
for(let cue=0;cue<9;cue++){
 const p=createDriver({bytes},C);p.init(cue);
 let events=[],bus=0;
 const m=L.ram.slice(),c=new C.CPU(m,{port:0x35,io:{read(){return bus;},write(a,v){if(a>=0xd400&&a<=0xd418){events.push(a-0xd400,v);bus=v;}}}});
 c.call(0x700,{x:cue});assert.deepStrictEqual(Array.from(p.writes),events,`cue ${cue} init`);
 let frames=0;
 for(;frames<30000;frames++){
  events=[];c.call(0x7bf,{}, {maxSteps:100000});p.play();
  assert.deepStrictEqual(Array.from(p.writes),events,`cue ${cue} frame ${frames}`);
  assert.equal(p.playing(),!!(m[0x20ac]|m[0x20ad]|m[0x20ae]));
  calls++;writes+=events.length/2;
  if(!p.playing()){frames++;break;}
 }
 lengths.push(frames);p.stop();assert.equal(p.playing(),false);assert.equal(p.sid[24],0);
}
assert.deepStrictEqual(lengths,[30000,30000,30000,30000,30000,78,145,129,145]);
console.log(`PASS: nine music cues, ${calls} calls, ${writes} ordered SID writes, isolated page driver against full listing`);
