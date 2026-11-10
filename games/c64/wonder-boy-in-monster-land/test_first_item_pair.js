'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const p of ['resident','stage-01'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',p,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [field7,field8,flags,first,second] of [[0x13,8,0,0x13,8],[0x13,8,0x10,0x14,8],[7,0x13,0x10,7,0x14],[0,2,0,0x13,0x14]]){
 const m=base.slice();m[0x7b]=0;m[0x4dbd]=0;m[0x4de2]=flags;m[0x476b]=field7;m[0x4771]=field8;if(!field7){m[0x4dd7]=3;m[0xa854]=0x10;}
 const cpu=new CPU(m);cpu.pc=0xa5d2;cpu.p&=~8;cpu.run({until:0xa60f,maxSteps:100});assert.equal(cpu.pc,0xa60f);assert.deepEqual([...m.slice(0xa850,0xa852)],[first,second]);if(!field7)assert.equal(m[0xa600]|m[0xa601]<<8,0x4dd7);
}
console.log('OK - first-load item-pair selection and conditional item');
