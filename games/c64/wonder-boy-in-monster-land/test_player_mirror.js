'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const mem=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)mem.set(r.b,r.a);
const src1=mem.slice(0xd980,0xd9bf),src2=mem.slice(0xd9c0,0xd9ff);
const bit=v=>parseInt(v.toString(2).padStart(8,'0').split('').reverse().join(''),2),pair=v=>((v&3)<<6)|((v&12)<<2)|((v&48)>>2)|((v&192)>>6);
function mirror(src,rev){return Uint8Array.from(Array.from({length:63},(_,i)=>rev(src[3*Math.floor(i/3)+2-i%3])));}
const first=mirror(src1,bit),second=mirror(src2,pair),capturedSecond=mem.slice(0xdd40,0xdd7f);
mem.fill(0,0xdd00,0xdd80);const cpu=new CPU(mem);cpu.call(0x2086,{x:0x66,y:0x74});
assert.equal(crypto.createHash('sha256').update(first).digest('hex'),'761d7c1870a3463718648ad3cb579766c94d15f63bd0ab645c0e06ecfd930b10');assert.deepEqual(mem.slice(0xdd00,0xdd3f),first);assert.deepEqual(mem.slice(0xdd40,0xdd7f),second);assert.deepEqual(second,capturedSecond);
assert.equal(cpu.x,0x68);assert.equal(cpu.y,0x76);
console.log('OK - the game mirrors 63 monochrome and 63 multicolour bytes');
