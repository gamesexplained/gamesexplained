'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-routine-observations.json')));let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(let index=0;index<24;index++)for(const player of [0,1]){
  const run=m.slice(),row=o.table+index*8,target=m[row+4]|m[row+5]<<8,tail=o.table-0x3cf;run[0x4dbd]=player;run[0x7b]=3;run[0x4756]=0;run[0x10]=run[0x11]=run[0x12]=run[0x13]=run[0x14]=0;for(const [addr,marker] of [[0x76fd,0x10],[0x76f3,0x11],[0x76e9,0x12],[0x76e4,0x13]])run.set([0xe6,marker,0x60],addr);run[0x4780]=0x00;run[0x4786]=0x03;run.set([0xe6,0x14,0x60],0x0300);
  const cpu=new CPU(run);cpu.pc=target;cpu.a=index+1;cpu.run({until:index>=20?0x536f:tail+7,maxSteps:100});
  if(index>=20){const vals={20:[0,5],21:[1,8],22:[2,5],23:[3,3]};assert.equal(cpu.a,vals[index][0]);assert.equal(cpu.x,vals[index][1])}
  else{assert.equal(run[0x4756],255);if(index<=3)assert.equal(run[0x4dd5+player],index+1);else if(index<=5)assert.equal(run[0x10],1);else if(index<=10)assert.equal(run[0x4dd9+player],index+1-6);else if(index<=12)assert.equal(run[0x11],1);else if(index<=16){assert.equal(run[0x4dd7+player],index+1-13);assert.equal(run[0x14],1)}else if(index<=18)assert.equal(run[0x12],1);else assert.equal(run[0x13],1)}cases++;
 }
}
console.log(`OK - ${cases} controlled shop item-effect paths with external routines stubbed`);
