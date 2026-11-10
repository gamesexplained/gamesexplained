'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const values=[0,5,9,13,17,20,22,24,24,24,22,20,17,13,9,5,0,-5,-9,-13,-17,-20,-22,-24,-24,-24,-22,-20,-17,-13,-9,-5];assert.deepEqual([...base.slice(0x5662,0x5682)],values.map(x=>x&255));
for(let index=0;index<32;index++){
 const m=base.slice();m[0x5682]=index;m[0x064a]=0xf8;m[0x064b]=0x10;m[0x49]=0x40;const cpu=new CPU(m);cpu.pc=0x0527;cpu.run({until:0x0548,maxSteps:40});assert.equal(cpu.pc,0x0548);const expected=(0x10f8+values[index])&65535;assert.deepEqual([...m.slice(0x47,0x49)],[expected&255,expected>>8]);assert.equal(m[0x0543],values[index]<0?255:0);assert.equal(m[0x49],0x3f);
}
const m=base.slice(),expected=Buffer.from('Add credits and\0select again[\0\0','ascii');assert.deepEqual([...m.slice(0x0678,0x0697)],[...expected]);assert.equal(m[0x0697],0xfe);m.set([0x86,0x10,0x84,0x11,0xe6,0x12,0x60],0x77e0);m.fill(0,0x10,0x13);const cpu=new CPU(m);cpu.pc=0x063f;cpu.run({until:0x05e0,maxSteps:20});assert.equal(cpu.pc,0x05e0);assert.deepEqual([...m.slice(0x10,0x13)],[0x78,6,1]);
console.log('OK - resident continue message and 32 signed displacements');
