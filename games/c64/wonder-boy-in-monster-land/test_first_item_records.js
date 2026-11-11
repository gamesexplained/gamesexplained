'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,base=new Uint8Array(65536);
for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
const messageAddresses=new Set(JSON.parse(fs.readFileSync(path.join(root,'first-messages.json'))).records.map(x=>x.address));
for(let id=0;id<24;id++){
 const row=0xaba1+id*8,b=base.slice(row,row+8),draw=b[2]+256*b[3],effect=b[4]+256*b[5],message=b[6]+256*b[7];assert(messageAddresses.has(message));
 {const m=base.slice(),cpu=new CPU(m);cpu.pc=0xa7da;cpu.a=id;cpu.p&=~8;cpu.run({until:0x77e0,maxSteps:25});assert.equal(cpu.pc,0x77e0);assert.equal(cpu.x|cpu.y<<8,message);}
 {const m=base.slice(),cpu=new CPU(m);m[0xa851]=id;cpu.pc=0xa60f;cpu.run({until:0xa624,maxSteps:25});assert.equal(cpu.pc,0xa624);assert.equal(m[0xa625]|m[0xa626]<<8,draw);}
 {const m=base.slice(),cpu=new CPU(m);cpu.pc=0xa76f;cpu.a=id;cpu.p&=~8;cpu.run({until:0xa784,maxSteps:25});assert.equal(cpu.pc,0xa784);assert.equal(m[0xa785]|m[0xa786]<<8,effect);assert.equal(cpu.a,(id+1)&255);}
 {const m=base.slice(),cpu=new CPU(m);cpu.call(0xa807,{a:id},{maxSteps:200});const d=[(b[1]>>4)+1,(b[1]&15)+1,(b[0]>>4)+1,(b[0]&15)+1];for(let i=0;i<4&&d[i]===1;i++)d[i]=0;assert.deepEqual([...m.slice(0xa845,0xa849)],d);}
}
console.log('OK - 24 first-load item records select their price, draw, effect and message fields');
