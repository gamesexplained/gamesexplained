'use strict';
const path=require('path'),assert=require('assert'),{game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const g=game(__dirname);g.lib('cpu6502');const C=globalThis.C64Cpu;
const {createEffects}=g.run('music.html','trEffects','createEffects'),L=g.listing('parts/resident/listing.json');
let calls=0,sounding=0;
for(let voice=0;voice<3;voice++)for(let effect=0;effect<13;effect++){
 const d=createEffects({bytes:L.ram.slice(0x20c2,0x253e),voice},C);d.init(effect);let events=[],bus=0;
 const c=new C.CPU(L.ram.slice(),{port:0x35,io:{read(){return bus;},write(a,v){if(a>=0xd400&&a<=0xd418){events.push(a-0xd400,v);bus=v;}}}});
 c.call(0x20c2,{a:effect,x:voice});assert.deepStrictEqual(Array.from(d.writes),events);
 let gates=0;
 for(let f=0;f<2000;f++){events=[];c.call(0x21f5);d.play();assert.deepStrictEqual(Array.from(d.writes),events,`${voice}/${effect}/${f}`);gates+=+(!!(d.sid[voice*7+4]&1));calls++;assert.equal(d.playing(),!!(c.m[0x2416+voice]?c.m[0x23e4+voice]:(c.m[0x23ba+voice]|c.m[0x23e4+voice])));}
 if(effect){assert(gates>0,`silent effect ${effect} voice ${voice}`);sounding++;}d.stop();assert(!d.playing());
}
assert.equal(sounding,36);console.log(`PASS: 39 effect/voice requests, ${calls} calls; all 36 nonzero requests gated a voice`);
