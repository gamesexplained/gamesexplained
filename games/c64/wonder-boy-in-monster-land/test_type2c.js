'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [n,d] of [[19,0xbb9d],[24,0x9e7e],[28,0xa9c3]]){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(n).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 assert.equal(m[0x7f0b]|m[0x7f3b]<<8,d);
 for(const [timer,frame,active,hit,follow] of [[0,0,0,0,0],[0,0,1,0,0],[7,0,0,0,0],[7,2,1,0,0],[7,0,1,0,1],[7,2,1,1,0]]){
  const a=m.slice();a[0x1b29]=timer;a[0x1b18]=frame;a[0x1a2a]=active;a[0x1ac3]=56;a[0x1ad4]=26;a[0x19e6]=250;a[0x4c50]=1;a[0x4c70]=0x64;a[0x4cd0]=0x98;a.set([0x85,0x10,0x60],0x35c1);a.set([0xa9,5,0x60],0x34ea);a[0x792c]=0x60;a.set([hit?0x38:0x18,0x60],0x1179);a.set([follow?0x38:0x18,0x60],0x7227);a.set([0x85,0x11,0x60],0x5d7a);a.set([0x20,d&255,d>>8,0xea],0x02f0);const target=timer&&(!active||hit||follow)?0x4454:0x02f3,cpu=new CPU(a);cpu.x=1;cpu.pc=0x02f0;cpu.run({until:target,maxSteps:100});assert.equal(cpu.pc,target);assert.equal(a[0x10],timer?timer:active?0xa5:0);assert.equal(a[0x11],timer&&active&&!hit&&follow?4:0);if(timer){assert.equal(a[0x19c4],(250+frame)&255);assert.equal(a[0x1a08],1);assert.equal(a[0x1b18],frame?0:2);}else{assert.deepEqual([...a.slice(0x35bd,0x35bf)],[56,26]);if(active){assert.deepEqual([...a.slice(0x35bf,0x35c1)],[0xb2,0x4c]);assert.equal(a[0x1b29],0xa5);}}
 }
}
console.log('OK - type-$2C handler paths in loads 19, 24 and 28');
