'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');const {CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const slot=2;
function run(setup){const m=base.slice();for(const a of [0x1af5,0x1a8f,0x1b06,0x1ae4,0x19e5,0x19c3,0x1ac2,0x1ad3,0x1a7e,0x1b17])m[a+slot]=0;
 m[0x1af5+slot]=0x21;m[0x1b06+slot]=1;m[0x1ad3+slot]=1;
 // Isolate this routine; the move and release routines have independent behavior.
 m[0x4342]=0x60;m[0x4454]=0x60;m.set([0x38,0x60],0x4574);m.set([0x38,0x60],0x45bc);m.set([0xa9,slot,0xa0,9,0x60],0x71db);
 setup(m);new CPU(m).call(0x4250,{x:slot});return m;}
let m=run(m=>{m[0x1af5+slot]=1;m[0x1a8f+slot]=0x33});assert.equal(m[0x1af5+slot],0);assert.equal(m[0x1a8f+slot],0x33);
m=run(m=>{m[0x1b06+slot]=0;m[0x1ae4+slot]=6;m[0x19e5+slot]=0x41});assert.equal(m[0x1af5+slot],0x20);assert.equal(m[0x1a8f+slot],0xff);assert.equal(m[0x1ae4+slot],0);assert.equal(m[0x19c3+slot],0x41);assert.equal(m[0x1b06+slot],3);assert.equal(m[0x1ac2+slot],1);
m=run(m=>{m[0x1b17+slot]=1});assert.equal(m[0x1b17+slot],0xff);
m=run(m=>{m[0x1b17+slot]=0xff});assert.equal(m[0x1b17+slot],1);
m=run(m=>{m[0x1ac2+slot]=8;m[0x1a7e+slot]=0});assert.equal(m[0x1a7e+slot],1);
m=run(m=>{m[0x1ac2+slot]=8;m[0x1a7e+slot]=1;m[0x1ad3+slot]=3});assert.equal(m[0x1ad3+slot],9);assert.equal(m[0x1ac2+slot],9);assert.equal(m[0x1a7e+slot],0);
console.log('OK - entity lifetime, frame timer, phase and collision reversal decisions');
