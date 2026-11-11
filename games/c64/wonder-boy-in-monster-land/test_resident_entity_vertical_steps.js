'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [routine,mode,step,low,high,scroll] of [[0x4342,0,5,3,4,0],[0x4342,1,5,3,4,0],[0x4368,1,5,254,4,0],[0x4368,0,10,30,4,0],[0x4368,0,10,190,4,0],[0x4368,0,10,250,4,0],[0x4368,0,0,20,4,0x50]]){
 const m=base.slice();m[0x7a]=mode;m[0x4d69]=scroll;m[0x19a2]=m[0x1991]=low;m[0x1980]=high;m.set([0x20,routine&255,routine>>8,0xea],0x02f0);const cpu=new CPU(m);cpu.a=step;cpu.x=1;cpu.pc=0x02f0;cpu.run({until:0x02f3,maxSteps:60});assert.equal(cpu.pc,0x02f3);let carry=0;
 if(mode){const value=(((high<<8)|low)+(routine===0x4368?step:-step))&65535;assert.deepEqual([m[0x1991],m[0x1980]],[value&255,value>>8]);}else if(routine===0x4342)assert.equal(m[0x19a2],(low-step)&255);else{const total=(low+step)&255,limit=(scroll+0xc2)&255;carry=total>=limit?1:0;assert.equal(m[0x19a2],carry?limit:total);assert.equal(m[0x4398],limit);}assert.equal(cpu.c,carry);
}
console.log('OK - resident vertical step world/screen and clamp carry');
