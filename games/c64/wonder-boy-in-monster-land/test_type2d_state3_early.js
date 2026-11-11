'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),m=new Uint8Array(65536);for(const p of ['resident','stage-31'])for(const r of JSON.parse(fs.readFileSync(path.join(parts,p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
for(const [timer,slots,carry] of [[1,0,0],[0,0,0],[253,5,0],[253,4,0],[253,4,1]]){const a=m.slice();a[0x1b07]=timer;a[0x962a]=slots;a.fill(0,0x10,0x12);a.set([0xe6,0x10,0x60],0x983e);a.set([0xe6,0x11,carry?0x38:0x18,0x60],0x190b);const target=timer===0||timer===1?0x9647:carry?0x9794:0x980b,cpu=new CPU(a);cpu.x=1;cpu.pc=0x976b;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.equal(a[0x1b07],(timer-1)&255);assert.deepEqual([...a.slice(0x10,0x12)],timer===1?[1,0]:timer===0||slots===5?[0,0]:[0,1]);if(timer===253&&slots===4)assert.equal(a[0x980a],1)}
console.log('OK - load-31 type-$2D/$2E state 3 entry');
