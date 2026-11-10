'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,parts=path.join(root,'parts'),base=new Uint8Array(65536),meta=JSON.parse(fs.readFileSync(path.join(root,'handler-table-observations.json')));for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);assert.equal(meta.schema,1);assert.equal(meta.loads.length,30);
for(const row of meta.loads){
 const p=path.join(parts,`stage-${String(row.load).padStart(2,'0')}`),m=base.slice(),symbols=JSON.parse(fs.readFileSync(path.join(p,'symbols.json')));for(const r of JSON.parse(fs.readFileSync(path.join(p,'listing.json'))).records)if(r.b)m.set(r.b,r.a);assert.equal(row.targets.length,48);for(const address of [0x7edf,0x7f0f])assert(symbols.comments.some(c=>c.address===address&&c.type==='line'));
 for(let i=0;i<48;i++){const expected=m[0x7edf+i]|m[0x7f0f+i]<<8;assert.equal(row.targets[i],expected);const a=m.slice(),cpu=new CPU(a);cpu.x=2;cpu.y=i;cpu.pc=0x2027;cpu.run({until:0x2036,maxSteps:20});assert.equal(cpu.pc,0x2036);assert.equal(a[0x2037]|a[0x2038]<<8,expected);}
}
console.log('OK - all captured entity-handler pairs patch their call targets');
