'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const mem=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)mem.set(r.b,r.a);
let cpu=new CPU(mem);cpu.pc=0x044d;cpu.step();assert.equal(cpu.pc,0x0699,'direct tally jump');
mem[0x7f3f]=0x61;mem[0x7f40]=0x96;cpu=new CPU(mem);cpu.pc=0x0450;cpu.step();assert.equal(cpu.pc,0x9661,'loaded indirect state jump');
console.log('OK - tally and loaded-state dispatch use separate jumps');
