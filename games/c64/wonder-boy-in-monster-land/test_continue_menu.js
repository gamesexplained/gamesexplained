'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536),records=JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records;
for(const r of records)if(r.b)base.set(r.b,r.a);
for(const a of [0x3c2a,0x370b,0x3c4c])base[a]=0x60;
function run(cpu,ends){let n=0;do{cpu.step();assert(++n<200,'execution exceeded bound')}while(!ends.includes(cpu.pc));return cpu.pc}
for(let bits=0;bits<8;bits++){
 const m=base.slice(),cpu=new CPU(m);cpu.pc=0x05e0;m[0x73]=(bits&1)?0:1;m[0x74]=(bits&2)?0:1;m[0x70]=(bits&4)?0:1;
 const expected=(bits&1)?0x060c:(bits&2)?0x05fd:(bits&4)?0x061b:0x05e0;
 assert.equal(run(cpu,[0x060c,0x05fd,0x061b,0x05e0]),expected);assert.equal(m[0x4d6b],0xfe)
}
for(const choice of [0,255])for(const credits of [0,1,3]){
 const m=base.slice(),cpu=new CPU(m);cpu.pc=0x061b;m[0x0649]=choice;m[0x0698]=credits;m[0x4dcf]=17;m[0x4dcd]=2;for(const a of [0x4dc1,0x4dc3,0x4dc5])m[a]=0x99;
 const end=run(cpu,[0x0203,0x0383,0x063f]);assert.equal(end,choice?0x0203:credits?0x0383:0x063f);
 if(!choice&&credits){assert.equal(m[0x0698],credits-1);assert.equal(m[0x4dcd],17);for(const a of [0x4dc1,0x4dc3,0x4dc5])assert.equal(m[a],0)}else{assert.equal(m[0x0698],credits);assert.equal(m[0x4dcd],2)}
}
console.log('OK - continue input priority and six choice/credit combinations match the resident code');
