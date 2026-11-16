'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const original = game(__dirname).listing('parts/museum/listing.json').ram;
const results = [];
function fresh(){let m=original.slice();return [m,new CPU(m,{port:0x35,io:{read:()=>255,write:()=>{}}})]}
let [m,c]=fresh();m[0x8026]=0;m[0xc07a]=0xc0;m[0xc07b]=0x42;m[0xc07d]=0;m[0xc07e]=0x63;m[0xc0cd]=0x83;m[0xc0ce]=0x42;m[0xc0d0]=3;m[0xc0d1]=0x63;
for(let i=0;i<20;i++)c.call(0xc02c);assert.equal(m[0xc07a],0xfc);assert.equal(m[0xc00c],0);c.call(0xc02c);assert.equal(m[0xc00c],1);m[0xc00b]=0;for(let i=0;i<42;i++)c.call(0xc010);assert.equal(m[0xc07a],0xf9);results.push('Weapon energy: twenty bitmap rows; next debit sets exhausted flag; one row refills after 42 calls.');
[m,c]=fresh();m[0x8050]=1;m[0xa2fa]=0;m[0xa302]=0;m[0x804a]=m[0x804b]=m[0x804c]=0;m[0xfc09]=100;m[0xfc11]=0;m[0xfc19]=100;m[0xfc0b]=100;m[0xfc13]=0;m[0xfc1b]=108;m[0xfc0c]=100;m[0xfc14]=0;m[0xfc1c]=108;m[0xa318]=m[0xa319]=0;
let hits=0;let options={hooks:{0xa4df:()=>{hits++;return true;}}};c.call(0x8d0d,{},options);assert.equal(m[0xa318],1);assert.equal(hits,0);c.call(0x93b4,{},options);assert.equal(m[0xa319],1);assert.equal(hits,1);results.push('Vigo phase with fresh flags: the second overlap invokes the shared depletion routine.');
[m,c]=fresh();m[0xa481]=0xc0;m[0xa482]=0x42;m[0xa484]=0x80;m[0xa485]=0x65;m[0xa5dc]=0x83;m[0xa5dd]=0x65;m[0xa2f9]=0;for(let i=0;i<10;i++)c.call(0xa474);assert.equal(m[0xa2f9],1);assert.equal(m[0xa481],0xfc);m[0x8050]=0;for(let i=0;i<25;i++)c.call(0xa585);assert.equal(m[0x8050],1);results.push('Janosz: ten projectile collisions each remove two rows, then 25 animation calls advance phase 0 to phase 1.');
for(let phase of [1,2]){[m,c]=fresh();m[0xa500]=0xc0;m[0xa501]=0x42;m[0xa503]=0;m[0xa504]=0x65;m[0xaea2]=3;m[0xaea3]=0x65;m[0x8050]=phase;m[0xa2f6]=0;m[0xa2f7]=m[0xa2f8]=0;for(let i=0;i<40;i++)c.call(0xa4ec);assert.equal(m[phase===1?0xa2fa:0xa302],1);let win=false;for(let i=0;i<25;i++)c.call(0xae13,{}, {hooks:{0x0a16:()=>{win=true;return true;}}});assert.equal(win,phase===2);assert.equal(m[0x8050],2);results.push(`Phase ${phase}: forty damage-entry calls empty twenty rows; 25 transition updates ${win?'win':'start phase 2'}.`);}
[m,c]=fresh();m[0x804a]=m[0x804d]=1;m[0x8047]=100;m[0x8048]=0;m[0x8049]=125;m[0xfc05]=100;m[0xfc0d]=0;m[0xfc15]=100;m[0xfc25]=0x64;m[0x8026]=0;let picked=0;c.call(0x957a,{x:0,y:0},{hooks:{0x8396:c=>c.rts(),0x8703:c=>c.rts()}});assert.equal(m[0x947e],1);assert.equal(m[0x8046],1);assert.equal(m[0xfc25],0xae);assert.equal(m[0x947f],0);results.push('Baby pickup replaces facing pointer 64 with carrying pointer AE, marks carrier 0, and removes crib baby.');
// Turning a beam off leaves its previously registered hit live.
[m,c]=fresh();
for (const [a,v] of [[0x8050,1],[0xa2fa,0],[0x804a,0],[0x804b,0],[0x804c,0],[0xfc09,100],[0xfc11,0],[0xfc19,100],[0xfc0b,100],[0xfc13,0],[0xfc1b,108],[0xfc0c,100],[0xfc14,0],[0xfc1c,108],[0xa318,0],[0xa319,0],[0x948a,1],[0x9486,0],[0xfe19,0]]) m[a]=v;
c.call(0x8d0d); c.call(0x99f0);
assert.equal(m[0x948a],0); assert.equal(m[0xa318],1);
m[0xfc0b]=m[0xfc13]=m[0xfc1b]=0;
let staleHits=0;
for(let i=0;i<4;i++)c.call(0x93b4,{}, {hooks:{0xa4df:()=>{staleHits++;return true;}}});
assert.equal(staleHits,4); results.push('A disabled beam retains its hit flag.');
// The second proton toggle incorrectly consumes player one's suppression byte.
[m,c]=fresh(); m[0x9486]=0;m[0x9487]=1;m[0x948d]=0;m[0xfc27]=0xa0;m[0xfe19]=0;
c.call(0xa080); assert.equal(m[0x9487],1);assert.equal(m[0x948d],1);
results.push('Second proton toggle ignores its own pickup-suppression byte.');
console.log(`OK - ${results.length} museum weapon, pickup and phase checks against the listing`);
