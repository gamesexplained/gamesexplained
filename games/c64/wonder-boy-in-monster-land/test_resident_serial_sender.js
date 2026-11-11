'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const value of [0,0xa5,255]){
 const m=base.slice();m.set([0xe0,0x02],0x7e68);m.set([0xe0,0x02],0x7e72);m[0x02e0]=0x40;const cpu=new CPU(m);cpu.a=value;cpu.x=0x27;cpu.y=0x38;cpu.pc=0x7e53;
 for(let bit=0;bit<8;bit++){cpu.run({until:0x7e67,maxSteps:30});assert.equal(cpu.pc,0x7e67);m[0x02e0]=0x40;cpu.run({until:0x7e71,maxSteps:30});assert.equal(cpu.pc,0x7e71);assert.equal(m[0xdd02],value&(0x80>>bit)?0x2f:0x1f);m[0x02e0]=0x3f;}
 cpu.run({until:0x7e80,maxSteps:30});assert.equal(cpu.pc,0x7e80);assert.deepEqual([cpu.x,cpu.y,m[0x62],m[0xdd02]],[0x27,0x38,0,0x3f]);
}
console.log('OK - resident serial sender with controlled clock reads');
