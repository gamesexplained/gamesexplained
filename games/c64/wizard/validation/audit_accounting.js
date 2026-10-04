/* Accounting audit against the original compiled program and interpreter.
 * Usage: node validation/audit_accounting.js [private-work-directory] [private-ROM-directory]
 * Uses local BASIC/KERNAL ROMs from the emulator installation; no ROM bytes are emitted.
 * PRINT operations are suppressed, keys supplied, and the disk save is hooked only for
 * the save-gate test. This checks arithmetic/control flow, not screen or disk fidelity.
 * Real input and disk save/reload observations are documented separately in audit.md.
 */
'use strict';
const assert=require('assert');
const {fresh,set,get,run}=require('./compiled_harness');
const counts={initialization:0,bonus:0,account:0,rotation:0,bands:0,ranking:0,saveGate:0,levelSelection:0};
{const s=fresh();s.m.fill(255,0x2c0,0x2d8);run(s,0x36d2,[0x36eb]);assert.deepEqual(Array.from(s.m.slice(0x2c0,0x2d8)),[...Array(6).fill(6),...Array(18).fill(0)]);counts.initialization++;}
for(const score of [0,9950,19950,99950,65500,9999950])for(const bonus of Array.from({length:25},(_,i)=>i)){
 const s=fresh();s.m.set(Buffer.from(String(score).padStart(8,'0')),0xc7b7);s.m[0xc008]=6;s.m[0xc034]=bonus;
 run(s,0x3d96,[0x3de9,0x3e6b]);const expected=score+50*bonus;assert.equal(get(s,12),expected);assert.equal(get(s,10),6+Math.floor(expected/10000)-Math.floor(score/10000));counts.bonus++;
}
for(let player=1;player<=6;player++)for(const score of [0,50,65500,65550,16777200]){
 const s=fresh();const initial=Array.from(s.m.slice(0x2c0,0x2d8));set(s,11,player);set(s,10,player+2);set(s,12,score);run(s,0x373d,[0x378c]);assert.equal(s.m[0x2bf+player],player+2);
 assert.equal(s.m[0x2c5+player]+s.m[0x2cb+player]*256+s.m[0x2d1+player]*65536,score);
 for(let j=0;j<24;j++)if(![player-1,player+5,player+11,player+17].includes(j))assert.equal(s.m[0x2c0+j],initial[j]);
 set(s,10,0);set(s,12,0);run(s,0x315b,[0x3191]);assert.equal(get(s,10),player+2);assert.equal(get(s,12),score);assert.equal(s.m[0xc008],player+2);counts.account++;
}
for(const current of [1,2,3,4,5,6]){
 const s=fresh();set(s,11,current);set(s,13,6);set(s,10,6);set(s,12,current*10000);set(s,20,2);s.m.fill(6,0x2c0,0x2c6);s.m[0xc006]=0;
 const stop=run(s,0x373d,[0x29c6,0x298f]);assert.equal(stop,0x29c6);assert.equal(get(s,11),current===6?1:current+1);assert.equal(get(s,20),current===6?3:2);counts.rotation++;
}
for(let mask=0;mask<64;mask++){
 const s=fresh();set(s,11,0);set(s,13,6);set(s,20,2);set(s,8,0);s.m[0xc006]=0;s.m.set(Array.from({length:6},(_,i)=>mask&(1<<i)?6:0),0x2c0);
 const stop=run(s,0x37bc,[0x29c6,0x3888]);assert.equal(stop,mask?0x29c6:0x3888);if(mask)assert.equal(get(s,11),1+Math.log2(mask&-mask));counts.rotation++;
}
for(const base of [0,10,20,30,40,128,167]){
 const s=fresh();set(s,8,base);set(s,13,6);set(s,20,10);s.m.set([6,0,1,254,255,250],0x2c0);s.io[0xc00]=15;
 run(s,0x3ba5,[0x3d95]);const extra=Math.floor(base/10+2);assert.deepEqual(Array.from(s.m.slice(0x2c0,0x2c6)),[6,0,1,254,255,250].map(x=>x?(x+extra)&255:0));assert.equal(get(s,20),0);assert.equal(get(s,8),base===30?128:base+10);counts.bands++;
}
// Rankings use the game's unpacker, then the full insertion pass (before UI input).
for(const points of [0,450,500,550,1000,1050,1500]){
 const s=fresh(),old=Array.from({length:10},(_,i)=>20-i);s.m.fill(0,0xc100,0xc180);s.m.set(old,0xc11e);run(s,0x4702,[0x4744]);set(s,13,1);s.m[0x2c6]=points&255;s.m[0x2cc]=(points>>8)&255;s.m[0x2d2]=0;
 run(s,0x419a,[0x42a5]);run(s,0x4745,[0x4799]);const got=Array.from(s.m.slice(0xc11e,0xc128));const wanted=old.slice();const ix=wanted.findIndex(x=>x<points/50);if(points&&ix>=0)wanted.splice(ix,0,points/50);assert.deepEqual(got,wanted.slice(0,10));counts.ranking++;
}
for(const slot of [-1,...Array.from({length:10},(_,i)=>i)]){
 const s=fresh();s.m.fill(0,0xc380,0xc38a);if(slot>=0)s.m[0xc380+slot]=1;let saves=0;run(s,0x4745,[0x4808,0x4877],{0x8b1e:c=>{saves++;s.m[0xfb]=0;c.rts();}});assert.equal(saves,slot<0?0:1);counts.saveGate++;
}
for(const base of [0,10,20,30,40,128,140,167,178])for(const round of [0,1,9]){
 const s=fresh();set(s,8,base);set(s,20,round);set(s,11,1);s.m[0xc031]=128;
 run(s,0x29c6,[0x2a19]);const expectedRound=base&128?0:round;const expectedFile=base&128?((base&127)>39?15:base&127):base+round;
 assert.equal(get(s,20),expectedRound);assert.equal(s.m[0xfb],expectedFile);counts.levelSelection++;
}
console.log(JSON.stringify({counts,passed:true},null,2));
